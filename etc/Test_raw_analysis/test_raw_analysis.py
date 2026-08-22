"""
Test harness for the raw analysis pipeline. No DB writes, no yfinance.

Reads one sector's stocks for one date straight from Mongo Financial_Data,
runs the ranking, and dumps the result to a CSV in this folder so the ranks
can be eyeballed before anything is wired into stock_analysis.

Usage:
    python test_raw_analysis.py --sector Energy
    python test_raw_analysis.py --sector Energy --date 2026-08-19
    python test_raw_analysis.py --sector "Financial Services" --date 2026-08-19
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime
from pathlib import Path

import pymongo
from dotenv import load_dotenv

# Import the real pipeline from Scripts/Analysis (no local copy to drift).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "Scripts" / "Analysis"))
from RAW_analysis import run_raw_analysis

load_dotenv()

_mongo = pymongo.MongoClient(os.getenv("DATABASE"))
_coll = _mongo["market_analyser"]["Financial_Data"]

OUT_DIR = Path(__file__).resolve().parent


def _is_date_key(key):
    return len(key) == 10 and key[4] == "-" and key[7] == "-"


def _latest_date(doc):
    dates = [k for k in doc if _is_date_key(k)]
    return max(dates) if dates else None


def load_sector(sector, date):
    payloads = []
    for doc in _coll.find({}):
        target = date or _latest_date(doc)
        if not target:
            continue
        block = doc.get(target)
        if not block:
            continue
        if block.get("meta_data", {}).get("sector") != sector:
            continue
        if "ranking_factors" not in block:
            continue
        payloads.append(block)
    return payloads


def dump_csv(rows, sector, date):
    ranked = [r for r in rows if r.get("composite_rank") is not None]
    ranked.sort(key=lambda r: r["composite_rank"])
    skipped = [r for r in rows if r.get("composite_rank") is None]

    safe_sector = sector.replace(" ", "_")
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = OUT_DIR / f"ranking_{safe_sector}_{date}_{stamp}.csv"

    cols = [
        "composite_rank", "sector_rank", "symbol", "sector",
        "python_score", "sector_score", "composite_score",
        "python_action", "n_factors_used", "passed_gate",
        "mom_12_1", "vol_60", "beta_252", "roce",
        "de_ratio", "earnings_yield", "delivery_pct_20",
    ]

    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in ranked + skipped:
            fac = r.get("factors", {})
            w.writerow([
                r.get("composite_rank"), r.get("sector_rank"),
                r.get("symbol"), r.get("sector"),
                r.get("python_score"), r.get("sector_score"),
                r.get("composite_score"), r.get("python_action"),
                r.get("n_factors_used"), r.get("passed_gate"),
                fac.get("mom_12_1"), fac.get("vol_60"), fac.get("beta_252"),
                fac.get("roce"), fac.get("de_ratio"),
                fac.get("earnings_yield"), fac.get("delivery_pct_20"),
            ])
    return path


def main():
    ap = argparse.ArgumentParser(description="Test the raw analysis ranking on one sector.")
    ap.add_argument("--sector", required=True, help='e.g. Energy or "Financial Services"')
    ap.add_argument("--date", default=None, help="YYYY-MM-DD; latest if omitted")
    args = ap.parse_args()

    payloads = load_sector(args.sector, args.date)
    if not payloads:
        raise SystemExit(f"No stocks found for sector={args.sector} date={args.date or 'latest'}.")

    date_used = args.date or payloads[0].get("meta_data", {}).get("Trading_Date", "latest")
    print(f"Loaded {len(payloads)} stocks for {args.sector} ({date_used})")

    rows = run_raw_analysis(payloads)

    gated = sum(1 for r in rows if r["passed_gate"])
    ranked = sum(1 for r in rows if r.get("composite_rank") is not None)
    print(f"Passed gate: {gated} | Ranked: {ranked} | Gated out: {len(rows) - gated}")

    path = dump_csv(rows, args.sector, str(date_used))
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()