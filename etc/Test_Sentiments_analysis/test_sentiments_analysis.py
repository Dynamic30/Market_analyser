"""
Test harness for the sentiment analysis pipeline. No Postgres writes.

Reads one sector's stocks for one date from Mongo (Financial_Data + Sentiments),
runs the LLM scoring + ranking, and dumps two things to this folder:
  - a JSON of every stock's full sentiment output
  - a CSV of the sector/universe ranking

--sector and --date are required, --limit is optional.

    python test_sentiment_analysis.py --sector Energy --date 2026-08-20
    python test_sentiment_analysis.py --sector Energy --date 2026-08-20 --limit 10
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import pymongo
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from Scripts.Analysis.LLM_analysis import score_stocks, rank_scored

load_dotenv()
_db = pymongo.MongoClient(os.getenv("DATABASE"))["market_analyser"]
_financial = _db["Financial_Data"]
_sentiments = _db["Sentiments"]

OUT_DIR = Path(__file__).resolve().parent


def load_payloads(sector, date, limit=None):
    """Join Financial_Data + Sentiments for the sector, for one date."""
    payloads = []
    for doc in _financial.find({}):
        block = doc.get(date)
        if not block or block.get("meta_data", {}).get("sector") != sector:
            continue
        symbol = doc["_id"]
        sent = _sentiments.find_one({"_id": f"{symbol}.NS"}) or {}
        payloads.append({"financial_block": block, "articles": sent.get("articles", [])})
        if limit and len(payloads) >= limit:
            break
    return payloads


def dump_json(rows, sector, date):
    path = OUT_DIR / f"sentiment_{sector.replace(' ', '_')}_{date}.json"
    with open(path, "w") as f:
        json.dump(rows, f, indent=2, default=str)
    return path


def dump_csv(rows, sector, date):
    ranked = sorted((r for r in rows if r.get("sentiment_composite_rank")),
                    key=lambda r: r["sentiment_composite_rank"])
    skipped = [r for r in rows if not r.get("sentiment_composite_rank")]
    path = OUT_DIR / f"ranking_{sector.replace(' ', '_')}_{date}.csv"

    cols = ["sentiment_composite_rank", "sentiment_sector_rank", "symbol", "sector",
            "overall_bias_score", "overall_bias_label", "news_bias_score", "analysis_bias_score",
            "sentiment_sector_score", "sentiment_composite_score",
            "short_term_action", "long_term_action", "n_articles_used"]
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in ranked + skipped:
            w.writerow([r.get(c) for c in cols])
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sector", required=True)
    ap.add_argument("--date", required=True, help="YYYY-MM-DD")
    ap.add_argument("--limit", type=int, default=None, help="max stocks to score")
    args = ap.parse_args()

    payloads = load_payloads(args.sector, args.date, args.limit)
    if not payloads:
        raise SystemExit(f"No stocks for sector={args.sector} date={args.date}")
    print(f"Loaded {len(payloads)} stocks | scoring via LLM...")

    rows = rank_scored(score_stocks(payloads))
    ranked = sum(1 for r in rows if r.get("sentiment_composite_rank"))
    print(f"Scored: {len(rows)} | ranked: {ranked}")

    print(f"Wrote {dump_json(rows, args.sector, args.date)}")
    print(f"Wrote {dump_csv(rows, args.sector, args.date)}")


if __name__ == "__main__":
    main()