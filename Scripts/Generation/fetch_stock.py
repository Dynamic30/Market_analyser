from nsepython import nse_eq_symbols, nse_eq
import yfinance as yf

from sqlalchemy import create_engine, text
import json
import os
from dotenv import load_dotenv
import time
import pandas as pd, requests, io

from pathlib import Path

load_dotenv()

"""
mock

run the stock func in a loop (doable since it will run once on machine to fetch data)

def stock func
    take a stock 
    fetch (
    NSEPYTHON
        nse_symbol
        company_name
        isin
        nifty_markets
        listing_date
        face_value
        is_active


    YFINANCE
        sector (done)
        industry (done)
        market_cap (done)
        business_summary

    )

"""

from Scripts.Generation.seed_db import apply_schema

# Postgres, started by docker-compose.yml. Set SQL_DB in .env.
engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)
PROJECT_ROOT = Path(__file__).parent.parent.parent



def build_index_map():
    # just a basic func to fetch market mapping
    INDEX_FILES = {
    # ---- broad market ----
    "NIFTY 50":            "ind_nifty50list.csv",
    "NIFTY 100":           "ind_nifty100list.csv",
    "NIFTY 200":           "ind_nifty200list.csv",
    "NIFTY 500":           "ind_nifty500list.csv",
    "NIFTY MIDCAP 100":    "ind_niftymidcap100list.csv",
    "NIFTY SMALLCAP 100":  "ind_niftysmallcap100list.csv",

    # ---- sectoral ----
    "NIFTY BANK":                "ind_niftybanklist.csv",
    "NIFTY IT":                  "ind_niftyitlist.csv",
    "NIFTY FINANCIAL SERVICES":  "ind_niftyfinancelist.csv",
    "NIFTY FMCG":                "ind_niftyfmcglist.csv",
    "NIFTY PHARMA":              "ind_niftypharmalist.csv",
    "NIFTY AUTO":                "ind_niftyautolist.csv",
    "NIFTY METAL":               "ind_niftymetallist.csv",
    "NIFTY REALTY":              "ind_niftyrealtylist.csv",
    "NIFTY MEDIA":               "ind_niftymedialist.csv",
    "NIFTY PSU BANK":            "ind_niftypsubanklist.csv",
    "NIFTY PRIVATE BANK":        "ind_nifty_privatebanklist.csv",
    "NIFTY ENERGY":              "ind_niftyenergylist.csv",
    "NIFTY INFRASTRUCTURE":      "ind_niftyinfralist.csv",
    "NIFTY CONSUMER DURABLES":   "ind_niftyconsumerdurableslist.csv",
    "NIFTY OIL & GAS":           "ind_niftyoilgaslist.csv",
    "NIFTY HEALTHCARE":          "ind_niftyhealthcarelist.csv",
}
    base = "https://archives.nseindia.com/content/indices/"
    membership = {}                                   # symbol -> [index names]
    for name, fname in INDEX_FILES.items():
        try:
            r = requests.get(base + fname, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
            idx = pd.read_csv(io.StringIO(r.text))
            idx.columns = idx.columns.str.strip()
            for sym in idx['Symbol']:
                membership.setdefault(sym, []).append(name)
        except Exception as e:
            print(f"index {name} failed: {e}")
        time.sleep(0.3)
    return membership

def per_stock_data(stock,NSE_MASTER,INDEX_MAP):

    # nsepython — bail before the yfinance call so an unknown symbol costs nothing
    if stock not in NSE_MASTER.index:
        return None

    row = NSE_MASTER.loc[stock]
    status = "active"

    # yfinance
    ticker = yf.Ticker(f"{stock}.NS")
    info = ticker.info
    sector = info.get('sector')
    industry = info.get('industry')
    market_cap = info.get('marketCap')
    business_summary = info.get('longBusinessSummary')

    company_name = row['NAME OF COMPANY']
    isin = row['ISIN NUMBER']
    nifty_markets = json.dumps(INDEX_MAP.get(stock, []))
    listing_date = row['DATE OF LISTING']
    face_value = float(row['FACE VALUE'])
    is_active = status

    return {
        "nse_symbol": stock,
        "company_name": company_name,
        "isin": isin,
        "sector": sector,
        "industry": industry,
        "market_cap": market_cap,
        "nifty_markets": nifty_markets,
        "listing_date": listing_date,
        "face_value": face_value,
        "business_summary": business_summary,
        "is_active": is_active,
    }


def main():
    stocks :list = nse_eq_symbols()
    if not stocks:
        raise RuntimeError(
            "nse_eq_symbols() returned nothing — NSE is likely blocking this host (403)."
        )
    url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    df = pd.read_csv(io.StringIO(r.text))
    df.columns = df.columns.str.strip()
    df['DATE OF LISTING'] = pd.to_datetime(
        df['DATE OF LISTING'], format='%d-%b-%Y').dt.strftime('%Y-%m-%d')
    NSE_MASTER = df.set_index('SYMBOL')
    INDEX_MAP  = build_index_map()
    print("got NSE MASTER AND INDEX MAP")

    # Make sure the tables exist. seed_db.py owns this now — it reads the same
    # .sql files and works on Postgres (the old raw.executescript() was a
    # sqlite3-only method and does not exist on psycopg).
    with engine.begin() as conn:
        apply_schema(conn)

    # nifty_markets is a JSONB column and listing_date is a DATE column, so the
    # plain strings we build have to be cast on the way in.
    insert_sql = text("""
    INSERT INTO stocks (nse_symbol, company_name, isin, sector, industry,
                        market_cap, nifty_markets, listing_date, face_value,
                        business_summary, is_active)
    VALUES (:nse_symbol, :company_name, :isin, :sector, :industry,
            :market_cap, CAST(:nifty_markets AS JSONB), CAST(:listing_date AS DATE), :face_value,
            :business_summary, :is_active)
    ON CONFLICT (nse_symbol) DO UPDATE SET
        company_name     = EXCLUDED.company_name,
        sector           = EXCLUDED.sector,
        industry         = EXCLUDED.industry,
        market_cap       = EXCLUDED.market_cap,
        nifty_markets    = EXCLUDED.nifty_markets,
        face_value       = EXCLUDED.face_value,
        business_summary = EXCLUDED.business_summary,
        is_active        = EXCLUDED.is_active
""")


    with engine.connect() as conn:
        existing = {row[0] for row in conn.execute(text("SELECT nse_symbol FROM stocks"))} # to fetch current stock names

        failed = []
        for i, stock in enumerate(stocks):
            # to skip already existing brands
            if stock in existing:
                continue
            time.sleep(0.5)
            try:
                data = per_stock_data(stock, NSE_MASTER, INDEX_MAP)
            except Exception as e:
                failed.append((stock, str(e)))
                print(f"FAILED -> {stock}: {e}")
                continue

            if data is None:
                failed.append((stock, "not in EQUITY_L.csv"))
                continue

            conn.execute(insert_sql, data)
            conn.commit()
            print(f"done -> {stock}")

    print(f"skipping {len(existing)} already done")
    if failed:
        print(f"{len(failed)} failed: {[s for s, _ in failed]}")
    return


if __name__ == "__main__":
    main()