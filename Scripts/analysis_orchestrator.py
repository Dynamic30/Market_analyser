



from __future__ import annotations

from datetime import datetime
from pathlib import Path
import argparse
import pymongo
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from Analysis.RAW_analysis import run_raw_analysis
from Analysis.LLM_analysis import score_stocks, rank_scored
from Analysis.combined_analysis import run_combined
import logging
import json
from concurrent.futures import ThreadPoolExecutor


load_dotenv()


LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(threadName)s] %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / f"analysis_{datetime.now():%Y%m%d_%H%M%S}.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("market")


_engine = create_engine(os.getenv("SQL_DB"))

_mongo = pymongo.MongoClient(os.getenv("DATABASE"))
_db = _mongo["market_analyser"]
_financial = _db["Financial_Data"]
_sentiments = _db["Sentiments"]

RAW_QUERY = """
    INSERT INTO stock_analysis (
        nse_symbol, analysis_date, price, sector, passed_universe_gate,
        mom_12_1, vol_60, beta_252, roce, de_ratio, earnings_yield, delivery_pct_20,
        sector_score, sector_rank, composite_score, composite_rank,
        n_factors_used, python_score, python_action, python_reasoning
    ) VALUES (
        :symbol, :date, :price, :sector, :gate,
        :mom_12_1, :vol_60, :beta_252, :roce, :de_ratio, :earnings_yield, :delivery_pct_20,
        :sector_score, :sector_rank, :composite_score, :composite_rank,
        :n_factors_used, :python_score, :python_action, :python_reasoning
    )
    ON CONFLICT (nse_symbol, analysis_date) DO UPDATE SET
        price = EXCLUDED.price, sector = EXCLUDED.sector,
        passed_universe_gate = EXCLUDED.passed_universe_gate,
        mom_12_1 = EXCLUDED.mom_12_1, vol_60 = EXCLUDED.vol_60,
        beta_252 = EXCLUDED.beta_252, roce = EXCLUDED.roce,
        de_ratio = EXCLUDED.de_ratio, earnings_yield = EXCLUDED.earnings_yield,
        delivery_pct_20 = EXCLUDED.delivery_pct_20,
        sector_score = EXCLUDED.sector_score, sector_rank = EXCLUDED.sector_rank,
        composite_score = EXCLUDED.composite_score, composite_rank = EXCLUDED.composite_rank,
        n_factors_used = EXCLUDED.n_factors_used, python_score = EXCLUDED.python_score,
        python_action = EXCLUDED.python_action, 
        python_reasoning = EXCLUDED.python_reasoning,
        updated_at = CURRENT_TIMESTAMP
"""

SENTIMENT_QUERY = """
    INSERT INTO stock_analysis (
        nse_symbol, analysis_date,
        news_bias_score, news_bias_label,
        analysis_bias_score, analysis_bias_label,
        overall_bias_score, overall_bias_label,
        short_term_action, long_term_action,
        sentiment_sector_score, sentiment_sector_rank,
        sentiment_composite_score, sentiment_composite_rank,
        n_articles_used, llm_reasoning, price_ranges, risks
    ) VALUES (
        :symbol, :date,
        :news_bias_score, :news_bias_label,
        :analysis_bias_score, :analysis_bias_label,
        :overall_bias_score, :overall_bias_label,
        :short_term_action, :long_term_action,
        :sentiment_sector_score, :sentiment_sector_rank,
        :sentiment_composite_score, :sentiment_composite_rank,
        :n_articles_used, :llm_reasoning, :price_ranges, :risks
    )
    ON CONFLICT (nse_symbol, analysis_date) DO UPDATE SET
        news_bias_score = EXCLUDED.news_bias_score,
        news_bias_label = EXCLUDED.news_bias_label,
        analysis_bias_score = EXCLUDED.analysis_bias_score,
        analysis_bias_label = EXCLUDED.analysis_bias_label,
        overall_bias_score = EXCLUDED.overall_bias_score,
        overall_bias_label = EXCLUDED.overall_bias_label,
        short_term_action = EXCLUDED.short_term_action,
        long_term_action = EXCLUDED.long_term_action,
        sentiment_sector_score = EXCLUDED.sentiment_sector_score,
        sentiment_sector_rank = EXCLUDED.sentiment_sector_rank,
        sentiment_composite_score = EXCLUDED.sentiment_composite_score,
        sentiment_composite_rank = EXCLUDED.sentiment_composite_rank,
        n_articles_used = EXCLUDED.n_articles_used,
        llm_reasoning = EXCLUDED.llm_reasoning,
        price_ranges = EXCLUDED.price_ranges,
        risks = EXCLUDED.risks,
        updated_at = CURRENT_TIMESTAMP
"""

# helper functions 

def latest_date():
    latest = None
    for doc in _financial.find({}, {"_id": 0}):
        for key in doc:
            if len(key) == 10 and key[4] == "-" and key[7] == "-":
                if latest is None or key > latest:
                    latest = key
    return latest


def load_payloads(collection, date, sector=None, limit=None):
    # fetch data from mongo db

    payloads = []
    for doc in collection.find({}):
        block = doc.get(date)
        if not block:
            continue
        if "ranking_factors" not in block:
            continue
        if sector and block.get("meta_data", {}).get("sector") != sector:
            continue
        payloads.append(block)
        if limit and len(payloads) >= limit:
            break

    return payloads

def write_to_db(query, rows):
    # push data to postgress

    with _engine.begin() as conn:
        for r in rows:
            conn.execute(text(query), r)


# Analysis Functions

def RunCombinedAnalysis(date):
    with _engine.connect() as conn:
        today_rows = [dict(r) for r in conn.execute(text(
            "SELECT nse_symbol, price, python_score, overall_bias_score, combined_action FROM stock_analysis WHERE analysis_date = :date"
        ), {"date": date}).mappings().all()]

    if not today_rows:
        log.warning(f"Combined: no rows for {date}")
        return

    # find previous date
    with _engine.connect() as conn:
        prev_date = conn.execute(text(
            "SELECT DISTINCT analysis_date FROM stock_analysis WHERE analysis_date < :date ORDER BY analysis_date DESC LIMIT 1"
        ), {"date": date}).scalar()

    prev_rows = []
    if prev_date:
        with _engine.connect() as conn:
            prev_rows = [dict(r) for r in conn.execute(text(
                "SELECT nse_symbol, price, combined_action FROM stock_analysis WHERE analysis_date = :date"
            ), {"date": str(prev_date)}).mappings().all()]

    today, verified = run_combined(today_rows, prev_rows)

    with _engine.begin() as conn:
        for r in today:
            conn.execute(text(
                "UPDATE stock_analysis SET combined_score = :cs, combined_action = :ca, updated_at = CURRENT_TIMESTAMP WHERE nse_symbol = :sym AND analysis_date = :date"
            ), {"cs": r.get("combined_score"), "ca": r.get("combined_action"), "sym": r["nse_symbol"], "date": date})
        for r in verified:
            if r.get("actual_close_pct") is None:
                continue
            conn.execute(text(
                "UPDATE stock_analysis SET actual_close_pct = :pct, actual_direction = :dir, matched = :m, updated_at = CURRENT_TIMESTAMP WHERE nse_symbol = :sym AND analysis_date = :date"
            ), {"pct": r["actual_close_pct"], "dir": r["actual_direction"], "m": r["matched"], "sym": r["nse_symbol"], "date": str(prev_date)})

    log.info(f"Combined: {len(today)} scored, {len([r for r in verified if r.get('matched')])} verified")

def RunRawAnalysis(date, sector=None, limit=None):

    # call analysis function and run sector wise 
    # push data to database

    payloads = load_payloads(_financial, date, sector, limit)
    if not payloads:
        log.warning(f"No data for {date}")
        return

    log.info(f"Raw: {len(payloads)} stocks for {date}")
    rows = run_raw_analysis(payloads)

    params = []
    for r in rows:
        if not r.get("symbol"):
            continue
        f = r.get("factors", {})
        params.append({
            "symbol": r["symbol"], "date": date, "price": r.get("price"),
            "sector": r.get("sector"), "gate": r.get("passed_gate",False),
            "mom_12_1": f.get("mom_12_1"), "vol_60": f.get("vol_60"),
            "beta_252": f.get("beta_252"), "roce": f.get("roce"),
            "de_ratio": f.get("de_ratio"), "earnings_yield": f.get("earnings_yield"),
            "delivery_pct_20": f.get("delivery_pct_20"),
            "sector_score": r.get("sector_score"), "sector_rank": r.get("sector_rank"),
            "composite_score": r.get("composite_score"), "composite_rank": r.get("composite_rank"),
            "n_factors_used": r.get("n_factors_used"), "python_score": r.get("python_score"),
            "python_action": r.get("python_action"),
            "python_reasoning": r.get("python_reasoning"),
        })

    write_to_db(RAW_QUERY, params)
    log.info(f"Raw done: {len(params)} written")

def latest_sector_summary(sector=None):
    if not sector:
        return {}
    sql = """
        SELECT sector, summary
        FROM sector_summary
        WHERE sector = :sector
        ORDER BY created_at DESC
        LIMIT 1
    """
    with _engine.connect() as conn:
        row = conn.execute(text(sql), {"sector": sector}).mappings().first()
    return {row["sector"]: row["summary"]} if row else {}


def RunSentimentsAnalysis(date, sector=None, limit=None):

    financial_payloads = load_payloads(_financial, date, sector, limit)
    if not financial_payloads:
        log.warning(f"No financial data for {date}")
        return

    sector_summaries = latest_sector_summary(sector)

    payloads = []
    for block in financial_payloads:
        symbol = block.get("meta_data", {}).get("company_name")
        if not symbol:
            continue
        sent_doc = _sentiments.find_one({"_id": f"{symbol}.NS"})
        articles = sent_doc.get("articles", []) if sent_doc else []
        payloads.append({"financial_block": block, "articles": articles})

    log.info(f"Sentiment: {len(payloads)} stocks for {date}")

    scored = score_stocks(payloads, sector_summaries)
    ranked = rank_scored(scored)

    # build params
    params = []
    for r in ranked:
        if not r.get("symbol"):
            continue
        params.append({
            "symbol": r["symbol"], "date": date,
            "news_bias_score": r.get("news_bias_score"),
            "news_bias_label": r.get("news_bias_label"),
            "analysis_bias_score": r.get("analysis_bias_score"),
            "analysis_bias_label": r.get("analysis_bias_label"),
            "overall_bias_score": r.get("overall_bias_score"),
            "overall_bias_label": r.get("overall_bias_label"),
            "short_term_action": r.get("short_term_action"),
            "long_term_action": r.get("long_term_action"),
            "sentiment_sector_score": r.get("sentiment_sector_score"),
            "sentiment_sector_rank": r.get("sentiment_sector_rank"),
            "sentiment_composite_score": r.get("sentiment_composite_score"),
            "sentiment_composite_rank": r.get("sentiment_composite_rank"),
            "n_articles_used": r.get("n_articles_used"),
            "llm_reasoning": json.dumps(r.get("llm_reasoning")),
            "price_ranges": json.dumps(r.get("price_ranges")),
            "risks": json.dumps(r.get("risks")),
        })

    write_to_db(SENTIMENT_QUERY, params)
    log.info(f"Sentiment done: {len(params)} written")



if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog='Market Analyser Analysis Pipeline',
        description='Run analysis on raw and news sentiments'
    )
    parser.add_argument("--date", default=None, help="YYYY-MM-DD; latest if omitted")
    parser.add_argument("--sector", default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--raw", action="store_true", help="Run raw analysis only")
    parser.add_argument("--sentiment", action="store_true", help="Run sentiment analysis only")
    parser.add_argument("--combined", action="store_true", help="Run combined analysis + verification only")
    parser.add_argument("--combined-all", action="store_true", help="Backfill combined analysis + verification for all unprocessed dates")

    args = parser.parse_args()
    if args.combined_all:
        with _engine.connect() as conn:
            dates = conn.execute(text(
                "SELECT DISTINCT analysis_date FROM stock_analysis WHERE combined_score IS NULL ORDER BY analysis_date"
            )).scalars().all()
        for d in dates:
            RunCombinedAnalysis(str(d))
        raise SystemExit(0)
    
    date = args.date or latest_date()

    if not date:
        log.error("No date found in Mongo")
        raise SystemExit(1)

    log.info(f"Analysis for {date}")

    # no flag = both
    run_both = not args.raw and not args.sentiment


    if args.combined:
        RunCombinedAnalysis(date)


    elif run_both:
        with ThreadPoolExecutor(max_workers=2) as pool:
            f1 = pool.submit(RunRawAnalysis, date, args.sector, args.limit)
            f2 = pool.submit(RunSentimentsAnalysis, date, args.sector, args.limit)
            f1.result()
            f2.result()
        RunCombinedAnalysis(date)

    else:
        if args.raw:
            RunRawAnalysis(date, args.sector, args.limit)
        if args.sentiment:
            RunSentimentsAnalysis(date, args.sector, args.limit)
        RunCombinedAnalysis(date)