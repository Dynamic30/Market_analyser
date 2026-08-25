from __future__ import annotations

from Generation.processed import main_script
from Generation.Sentiments import google_news
import argparse
import time
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from concurrent.futures import ThreadPoolExecutor, as_completed

import logging
from datetime import datetime
from pathlib import Path

load_dotenv()
engine = create_engine(
    os.getenv("SQL_DB")
)

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(threadName)s] %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / f"generation_{datetime.now():%Y%m%d_%H%M%S}.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("market")


"""
Strucutre -> fetc brand names from stock, run processed.py and Sentiments.py, all data saving is udenr them only, so both run independently 
"""
def fetch_stock(sector :str |None=None, limit : int | None=None):
    sql = """
        SELECT nse_symbol FROM stocks
        WHERE is_active = 'active'
          AND (CAST(:sector AS TEXT) IS NULL
               OR COALESCE(NULLIF(sector, ''), 'Undefined') = :sector)
        ORDER BY market_cap DESC NULLS LAST
    """
    if limit:
        sql += " LIMIT :limit"
    with engine.connect() as conn:
        return conn.execute(
            text(sql), {"sector": sector, "limit": limit}
        ).scalars().all()

def fetch_sector():
    sql = """
        SELECT COALESCE(NULLIF(sector, ''), 'Undefined') AS sector,
               COUNT(*) AS n
        FROM stocks
        WHERE is_active = 'active'
        GROUP BY 1
        ORDER BY 1
    """
    with engine.connect() as conn:
        return conn.execute(text(sql)).all()

def financials(stock_name,as_of:str | None = None, market_ctx:int |None = None):
    return main_script(stock_name, as_of, market_ctx)

def sentiments(stock_name, trading_date = None):
    return google_news(stock_name,trading_date)


def generate_data(sector=None, limit=None, fin_workers=2, sent_workers=6):
    symbols = fetch_stock(sector, limit)
    if not symbols:
        log.warning("No active symbols matched.")
        return

    log.info(f"Start: {len(symbols)} stocks | fin={fin_workers} sent={sent_workers}")
    started = time.time()
    ok = fail = 0

    fin_pool = ThreadPoolExecutor(max_workers=fin_workers, thread_name_prefix="fin")
    sent_pool = ThreadPoolExecutor(max_workers=sent_workers, thread_name_prefix="sent")

    futures = {}
    for s in symbols:
        futures[fin_pool.submit(financials, s)] = ("financials", s)
        futures[sent_pool.submit(sentiments, s)] = ("sentiments", s)

    for f in as_completed(futures):
        job, symbol = futures[f]
        err = f.exception()
        elapsed = round(time.time() - started, 1)
        if err:
            fail += 1
            log.error(f"[{elapsed}s] FAIL {symbol} [{job}] {err}")
        else:
            ok += 1
            log.info(f"[{elapsed}s] OK {symbol} [{job}]")

    fin_pool.shutdown()
    sent_pool.shutdown()
    log.info(f"Done: {ok} ok, {fail} failed, {round(time.time()-started,1)}s")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog='Market Analyser Generation Pipeline',
        description='Fetch news sentimens and daiy financials of the company'
        )
    parser.add_argument("--sector")
    parser.add_argument("--limit",type=int)
    # parser.add_argument("--workers",type=int,default=2)
    parser.add_argument("--list-sectors", action="store_true", help="Show available sectors and exit")
    parser.add_argument("--fin-workers", type=int, default=2)
    parser.add_argument("--sent-workers", type=int, default=1)


    args = parser.parse_args()

    if args.list_sectors:
        for sector, n in fetch_sector():
            print(f"{n:>5}  {sector}")
        raise SystemExit(0)

    generate_data(args.sector, args.limit, args.fin_workers, args.sent_workers)
    

