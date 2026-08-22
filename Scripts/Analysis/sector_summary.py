"""
Weekly sector news summary. One LLM call per sector: this week's is_top_news
headlines + the previous summary -> a fresh summary, written to Postgres.
Prepended to each stock's prompt later as sector context.

    python Scripts/Analysis/sector_summary.py
    python Scripts/Analysis/sector_summary.py --sector Energy
"""

import argparse
import os
import sys
from datetime import datetime, timedelta, date
from pathlib import Path

import pymongo
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from model import call as llm_call, MODEL

load_dotenv()
_sentiments = pymongo.MongoClient(os.getenv("DATABASE"))["market_analyser"]["Sentiments"]
engine = create_engine(os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser"))


PROMPT = """You are a financial news editor for Indian NSE stocks. Summarize the recent news mood for the {sector} sector in 3-5 neutral sentences: overall tone, main themes, and any sector-wide risks or catalysts. No individual stock detail, no buy/sell advice.

{previous}RECENT HEADLINES (last 7 days):
{headlines}

Output only the summary text."""


def fetch_top_news(sector, days=7):
    """is_top_news articles for a sector's stocks, deduped by url, last `days`."""
    with engine.connect() as conn:
        symbols = conn.execute(text("""
            SELECT nse_symbol FROM stocks
            WHERE is_active = 'active'
              AND COALESCE(NULLIF(sector, ''), 'Undefined') = :sector
        """), {"sector": sector}).scalars().all()

    cutoff = date.today() - timedelta(days=days)
    seen, articles = set(), []
    for doc in _sentiments.find({"_id": {"$in": [f"{s}.NS" for s in symbols]}}):
        for a in doc.get("articles", []):
            if not a.get("is_top_news") or a.get("url") in seen:
                continue
            seen.add(a.get("url"))
            try:
                pub = datetime.strptime(a["published_date"], "%a, %d %b %Y %H:%M:%S %Z").date()
                if pub < cutoff:
                    continue
            except (KeyError, ValueError, TypeError):
                pass
            articles.append(a["title"])
    return articles


def make_summary(sector, headlines, previous):
    """Build the prompt and call the model."""
    prev_block = f"PREVIOUS SUMMARY (update it with the new headlines):\n{previous}\n\n" if previous else ""
    prompt = PROMPT.format(sector=sector, previous=prev_block, headlines="\n".join(f"- {h}" for h in headlines))
    return llm_call(prompt).strip()


def run(sector=None):
    with engine.connect() as conn:
        sectors = conn.execute(text("""
            SELECT DISTINCT COALESCE(NULLIF(sector, ''), 'Undefined')
            FROM stocks WHERE is_active = 'active'
            AND (CAST(:sector AS TEXT) IS NULL OR COALESCE(NULLIF(sector, ''), 'Undefined') = :sector)
        """), {"sector": sector}).scalars().all()

    for sec in sectors:
        headlines = fetch_top_news(sec)
        if not headlines:
            print(f"{sec}: no news, skipped")
            continue

        with engine.begin() as conn:
            previous = conn.execute(text("""
                SELECT summary FROM sector_summary WHERE sector = :s
                ORDER BY created_at DESC LIMIT 1
            """), {"s": sec}).scalar()

            summary = make_summary(sec, headlines, previous)
            conn.execute(text("""
                INSERT INTO sector_summary (sector, summary, n_articles_used, model, based_on_previous)
                VALUES (:sector, :summary, :n, :model, :prev)
            """), {"sector": sec, "summary": summary, "n": len(headlines),
                   "model": MODEL, "prev": previous is not None})
        print(f"{sec}: {len(headlines)} headlines")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sector")
    args = ap.parse_args()
    run(args.sector)