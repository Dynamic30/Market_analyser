"""
Sentiment analysis — pure functions, no DB (mirrors RAW_analysis.py).

Phase A: each stock's articles + financial snapshot -> LLM -> one score.
Phase B: z-score that score within sector, then rank sector + universe.

Two entry points so the orchestrator can save Phase A scores between them:
    score_stocks(payloads, sector_summaries=None) -> scored rows
    rank_scored(rows)                             -> ranked rows

Rows are keyed by symbol, same shape as raw, so the orchestrator writes both
the same way.
"""

import json
import math
import sys
from datetime import datetime, timedelta, date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from model import call as llm_call


PROMPT = """You are an equity research assistant for Indian NSE-listed stocks, focused on swing trades (1-10 days). Analyze the financial JSON and news, output ONE JSON object.

# WEIGHTING: technical 40%, fundamentals 30%, sentiment + institutional flow 30%.
Cyclical sectors (Energy, Realty, Metal, Auto): technical 50%. Defensive (FMCG, IT, Pharma): fundamental 40%.

# SCORE SCALE (bias scores are floats 0.0-1.0):
0.00-0.35 Bearish | 0.35-0.45 Mixed | 0.45-0.55 Neutral | 0.55-0.65 Mixed | 0.65-1.00 Bullish
Score by conviction, not caution. Use the FULL range: a clearly strong setup is 0.75-0.90, a clearly weak one 0.10-0.25 — do NOT hedge toward 0.5. 
Reserve 0.45-0.55 ONLY when signals genuinely cancel out or are absent. 
If you can name a directional lean, commit to it with a score past 0.60 or below 0.40. 
Mixed = real conflict in the inputs. Neutral = truly no signal. Do not default to Neutral/Mixed as a safe answer.


# GLOSSARY: "_pct" fields are already percent. beta 1.0 = moves with NIFTY. debt_to_equity 0.5 = 0.5x.
null / "No Data" / "NO DATA COLLECTED" = missing; ignore, don't lower scores for it. Weight recent news higher.

# PRICE RULES (derive from JSON, never invent; null if the input is missing):
buy_range:             low=round(nearest_support-0.5*atr_value), high=round(nearest_support+0.3*atr_value)
sell_range_short:      low=round(nearest_resistance-0.3*atr_value), high=round(nearest_resistance+0.3*atr_value)
sell_range_positional: low=round(target_price_mean*0.95), high=round(target_price_mean*1.05)
stop_loss:             price=round(nearest_support-1.0*atr_value)

# ACTIONS:
short_term: BUY if overall>=0.65 & price within 5% of buy_range; SELL if overall<=0.35 & price>=sell_range_short; HOLD if overall>=0.55 & price between them; else NEUTRAL.
long_term: BUY if upside_potential_pct>=15 & health "Healthy"; SELL if upside<=-10 or PE>60 weak; HOLD if upside -10..15 healthy; else NEUTRAL.

# OUTPUT (JSON only, no fences, start with {{ end with }}):
{{
  "news_bias":    {{ "label": "Bullish|Bearish|Neutral|Mixed", "score": 0.0 }},
  "analysis_bias":{{ "label": "Bullish|Bearish|Neutral|Mixed", "score": 0.0 }},
  "overall_bias": {{ "label": "Bullish|Bearish|Neutral|Mixed", "score": 0.0 }},
  "short_term_action": "BUY|SELL|HOLD|NEUTRAL",
  "long_term_action":  "BUY|SELL|HOLD|NEUTRAL",
  "buy_range":             {{ "low": 0, "high": 0, "note": "" }},
  "sell_range_short":      {{ "low": 0, "high": 0, "note": "" }},
  "sell_range_positional": {{ "low": 0, "high": 0, "note": "" }},
  "stop_loss":             {{ "price": 0, "note": "" }},
  "holding_duration": "intraday|swing|positional|long",
  "reasoning": {{ "technical": "", "fundamental": "", "sentiment": "", "synthesis": "" }},
  "key_risks": [ {{ "risk": "", "why": "" }}, {{ "risk": "", "why": "" }} ]
}}
Use null (not zeros) for any price object whose input is missing.
{sector_context}
Symbol: {symbol}
Trading Date: {trading_date}

FINANCIAL JSON:
{financial_json}

NEWS (deduped, recent first):
{news_digest}

Output the JSON now."""


def _num(v):
    try:
        v = float(v)
        return None if math.isnan(v) or math.isinf(v) else v
    except (TypeError, ValueError):
        return None


def build_news_digest(articles, as_of, days=7, top_n=8):
    """Dedup by url, keep last `days`, prefer is_top_news, cap at top_n."""
    if not articles:
        return "No recent news.", 0
    try:
        cutoff = datetime.strptime(as_of[:10], "%Y-%m-%d").date() - timedelta(days=days)
    except (ValueError, TypeError):
        cutoff = date.today() - timedelta(days=days)

    seen, kept = set(), []
    for a in articles:
        if a.get("url") in seen:
            continue
        seen.add(a.get("url"))
        try:
            pub = datetime.strptime(a["published_date"], "%a, %d %b %Y %H:%M:%S %Z").date()
            if pub < cutoff:
                continue
        except (KeyError, ValueError, TypeError):
            pass
        kept.append(a)

    kept.sort(key=lambda a: (bool(a.get("is_top_news")), a.get("published_date") or ""), reverse=True)
    kept = kept[:top_n]
    if not kept:
        return "No recent news.", 0

    lines = [f"- [{a.get('source','?')}] {a.get('title','')}\n  {(a.get('content_md') or '')[:500]}"
             for a in kept]
    return "\n".join(lines), len(kept)


# --- Phase A: text -> score (LLM) ---
def score_one(financial_block, articles, sector_summary=""):
    meta = financial_block.get("meta_data", {})
    symbol = meta.get("company_name")
    trading_date = meta.get("Trading_Date", str(date.today()))
    digest, n_used = build_news_digest(articles, trading_date)

    ctx = f"\nSECTOR CONTEXT (backdrop; the stock's own news still leads):\n{sector_summary}\n" if sector_summary else ""
    prompt = PROMPT.format(
        symbol=symbol, trading_date=trading_date,
        financial_json=json.dumps(financial_block, default=str),
        news_digest=digest, sector_context=ctx,
    )

    row = {"symbol": symbol, "sector": (meta.get("sector") or "").strip() or None,
           "n_articles_used": n_used, "overall_bias_score": None}
    try:
        p = _parse_json(llm_call(prompt))
    except Exception:
        return row  # unrankable; dropped in Phase B

    row.update({
        "news_bias_score": _num(p["news_bias"]["score"]), "news_bias_label": p["news_bias"]["label"],
        "analysis_bias_score": _num(p["analysis_bias"]["score"]), "analysis_bias_label": p["analysis_bias"]["label"],
        "overall_bias_score": _num(p["overall_bias"]["score"]), "overall_bias_label": p["overall_bias"]["label"],
        "short_term_action": p.get("short_term_action"), "long_term_action": p.get("long_term_action"),
        "holding_duration": p.get("holding_duration"),
        "price_ranges": {k: p.get(k) for k in ("buy_range", "sell_range_short", "sell_range_positional", "stop_loss")},
        "llm_reasoning": p.get("reasoning"), "risks": p.get("key_risks"),
    })
    return row


def _parse_json(raw):
    s = (raw or "").strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return json.loads(s[s.find("{"):s.rfind("}") + 1])


def score_stocks(payloads, sector_summaries=None):
    """payloads: [{financial_block, articles}]. Makes the LLM calls."""
    sector_summaries = sector_summaries or {}
    rows = []
    for p in payloads:
        sec = (p["financial_block"].get("meta_data", {}).get("sector") or "").strip()
        rows.append(score_one(p["financial_block"], p.get("articles") or [], sector_summaries.get(sec, "")))
    return rows


# --- Phase B: score -> rank (pure math, same as raw) ---
def _zscores(values):
    present = {k: v for k, v in values.items() if v is not None}
    if len(present) < 2:
        return {}
    xs = sorted(present.values())
    n = len(xs)
    lo, hi = xs[int(0.02 * n)], xs[min(n - 1, int(0.98 * n))]
    clip = {k: min(max(v, lo), hi) for k, v in present.items()}
    mean = sum(clip.values()) / len(clip)
    std = (sum((v - mean) ** 2 for v in clip.values()) / len(clip)) ** 0.5
    return {k: 0.0 for k in clip} if std == 0 else {k: (v - mean) / std for k, v in clip.items()}


def rank_scored(rows):
    """z-score overall_bias_score within sector, then rank sector + universe."""
    rankable = [r for r in rows if _num(r.get("overall_bias_score")) is not None]

    by_sector = {}
    for r in rankable:
        by_sector.setdefault(r.get("sector"), []).append(r)

    for members in by_sector.values():
        z = _zscores({r["symbol"]: _num(r["overall_bias_score"]) for r in members})
        for r in members:
            r["sentiment_sector_composite"] = round(z[r["symbol"]], 4) if r["symbol"] in z else None
        ranked = sorted((r for r in members if r["sentiment_sector_composite"] is not None),
                        key=lambda r: r["sentiment_sector_composite"], reverse=True)
        n = len(ranked)
        for i, r in enumerate(ranked):
            r["sentiment_sector_rank"] = i + 1
            r["sentiment_sector_score"] = round(100 * (n - i - 0.5) / n, 2)

    universe = sorted((r for r in rankable if r.get("sentiment_sector_composite") is not None),
                      key=lambda r: r["sentiment_sector_composite"], reverse=True)
    n = len(universe)
    for i, r in enumerate(universe):
        r["sentiment_composite_rank"] = i + 1
        r["sentiment_composite_score"] = round(100 * (n - i - 0.5) / n, 2)

    return rows