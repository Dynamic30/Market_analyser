"""
run_raw_analysis:
    load all stocks for date (one Mongo read)
    group by sector
    for each sector:
        chained_analysis(sector's stocks)  → composites + sector ranks, held in memory
    universal_score_sort(all composites)   → overall ranks
    write everything to DB (one write)
"""

import math

FACTORS = {
    "mom_12_1": 1,
    "vol_60": -1,
    "beta_252": -1,
    "roce": 1,
    "de_ratio": -1,
    "earnings_yield": 1,
    "delivery_pct_20": 1,
}
MIN_FACTORS = 5
_BAD = {"no data", "no data collected", "not configured", "none", ""}

# helper fn
def _num(v):
    if isinstance(v, str):
        if v.strip().lower() in _BAD:
            return None
        try:
            v = float(v)
        except ValueError:
            return None
    if v is None:
        return None
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(v) or math.isinf(v) else v

def _build_reasoning(r):
    f = r.get("factors", {})
    parts = []
    
    labels = {
        "mom_12_1": "Momentum", "vol_60": "Volatility", "beta_252": "Beta",
        "roce": "ROCE", "de_ratio": "D/E", "earnings_yield": "Earnings Yield",
        "delivery_pct_20": "Delivery%"
    }
    
    for key, label in labels.items():
        v = f.get(key)
        if v is not None:
            parts.append(f"{label}: {v}")

    action = r.get("python_action", "N/A")
    score = r.get("python_score", "N/A")
    sec_rank = r.get("sector_rank", "N/A")
    comp_rank = r.get("composite_rank", "N/A")
    sector = r.get("sector", "Unknown")
    n = r.get("n_factors_used", 0)

    factors_str = ", ".join(parts) if parts else "No factors"
    return f"{action} ({score}) | Sector #{sec_rank} in {sector}, Overall #{comp_rank} | {factors_str} | {n}/7 factors used"

def pull_analysis_factor(payload):
    meta = payload.get("meta_data", {})
    tech = payload.get("technical_signals", {})
    fund = payload.get("fundamental_health", {})
    rf = payload.get("ranking_factors", {})

    price = _num(meta.get("current_price"))
    mcap = _num(meta.get("market_cap_inr"))
    ptb = _num(fund.get("valuation", {}).get("price_to_book"))
    liquidity = tech.get("volume_dynamics", {}).get("liquidity_status", "")
    asm = tech.get("support_resistance", {}).get("asm_status")

    gate = (
        price is not None and price >= 20
        and mcap is not None and mcap >= 1e10
        and ptb is not None and ptb > 0
        and "Illiquid" not in str(liquidity)
        and asm is None
    )

    factors = {name: _num(rf.get(name)) for name in FACTORS}
    n_present = sum(1 for v in factors.values() if v is not None)


    return {
        "symbol": meta.get("company_name"),
        "sector": (meta.get("sector") or "").strip() or None,
        "passed_gate": gate and n_present >= MIN_FACTORS,
        "factors": factors,
        "price": price,
    }

# helper fn
def _zscores(values):
    present = {s: v for s, v in values.items() if v is not None}
    if len(present) < 2:
        return {}
    xs = sorted(present.values())
    n = len(xs)
    lo = xs[max(0, int(0.02 * n))]
    hi = xs[min(n - 1, int(0.98 * n))]
    clipped = {s: min(max(v, lo), hi) for s, v in present.items()}
    mean = sum(clipped.values()) / len(clipped)
    std = (sum((v - mean) ** 2 for v in clipped.values()) / len(clipped)) ** 0.5
    if std == 0:
        return {s: 0.0 for s in clipped}
    return {s: (v - mean) / std for s, v in clipped.items()}


def chained_analysis(sector_stocks):
    gated = [s for s in sector_stocks if s["passed_gate"]]

    z = {s["symbol"]: {} for s in gated}
    for factor, direction in FACTORS.items():
        raw = {s["symbol"]: s["factors"][factor] for s in gated}
        for sym, zval in _zscores(raw).items():
            z[sym][factor] = zval * direction

    for s in gated:
        zs = z[s["symbol"]]
        s["sector_composite"] = round(sum(zs.values()) / len(zs), 4) if zs else None
        s["n_factors_used"] = len(zs)

    ranked = [s for s in gated if s["sector_composite"] is not None]
    ranked.sort(key=lambda s: s["sector_composite"], reverse=True)
    n = len(ranked)
    for i, s in enumerate(ranked):
        s["sector_rank"] = i + 1
        s["sector_score"] = round(100 * (n - i - 0.5) / n, 2)

    return sector_stocks

def universal_score_sort(all_stocks):
    ranked = [s for s in all_stocks if s.get("sector_composite") is not None]
    ranked.sort(key=lambda s: s["sector_composite"], reverse=True)
    n = len(ranked)
    for i, s in enumerate(ranked):
        s["composite_rank"] = i + 1
        s["composite_score"] = s["sector_composite"]
        s["python_score"] = round(100 * (n - i - 0.5) / n, 2)
        if s["python_score"] >= 80:
            s["python_action"] = "BUY"
        elif s["python_score"] <= 20:
            s["python_action"] = "SELL"
        else:
            s["python_action"] = "HOLD"
    return all_stocks


def run_raw_analysis(payloads):
    rows = [pull_analysis_factor(p) for p in payloads]

    by_sector = {}
    for r in rows:
        by_sector.setdefault(r["sector"], []).append(r)

    for members in by_sector.values():
        chained_analysis(members)


    universal_score_sort(rows)

    for r in rows:
        r["python_reasoning"] = _build_reasoning(r)

    return rows