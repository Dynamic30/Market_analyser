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

engine = create_engine(os.getenv("SQL_DB","sqlite:///market.db"))
PROJECT_ROOT = Path(__file__).parent.parent.parent
SCHEMA_PATH = PROJECT_ROOT / "db_schema" / "stocks.sql"



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
    
    # yfinance
    ticker = yf.Ticker(f"{stock}.NS")
    info = ticker.info
    sector = info.get('sector')
    industry = info.get('industry')
    market_cap = info.get('marketCap') 
    business_summary = info.get('longBusinessSummary')

    # nsepython
    row  = NSE_MASTER.loc[stock]

    if stock in NSE_MASTER.index:
        status = "active"
    else:
        status = "inactive / no data"

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
    url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    df = pd.read_csv(io.StringIO(r.text))
    df.columns = df.columns.str.strip()
    df['DATE OF LISTING'] = pd.to_datetime(
        df['DATE OF LISTING'], format='%d-%b-%Y').dt.strftime('%Y-%m-%d')
    NSE_MASTER = df.set_index('SYMBOL')
    INDEX_MAP  = build_index_map()
    print("got NSE MASTER AND INDEX MAP")

    # check if db exists
    with open(SCHEMA_PATH) as f:
        schema_sql = f.read()
    
    raw = engine.raw_connection()
    try:
        raw.executescript(schema_sql)
        raw.commit()
    finally:
        raw.close()
    
    insert_sql = text("""
    INSERT INTO stocks (nse_symbol, company_name, isin, sector, industry,
                        market_cap, nifty_markets, listing_date, face_value,
                        business_summary, is_active)
    VALUES (:nse_symbol, :company_name, :isin, :sector, :industry,
            :market_cap, :nifty_markets, :listing_date, :face_value,
            :business_summary, :is_active)
    ON CONFLICT(nse_symbol) DO UPDATE SET
        company_name     = excluded.company_name,
        sector           = excluded.sector,
        industry         = excluded.industry,
        market_cap       = excluded.market_cap,
        nifty_markets    = excluded.nifty_markets,
        face_value       = excluded.face_value,
        business_summary = excluded.business_summary,
        is_active        = excluded.is_active

""")


    with engine.connect() as conn:
        existing = {row[0] for row in conn.execute(text("SELECT nse_symbol FROM stocks"))} # to fetch current stock names

        for i, stock in enumerate(stocks):
            # to skip already existing brands
            if stock in existing:
                continue
            time.sleep(0.5)
            data = per_stock_data(stock, NSE_MASTER, INDEX_MAP)
            

            conn.execute(insert_sql, data)
            if i % 10 == 0:
                conn.commit()
            conn.commit()
            print(f"done -> {stock}")
    print(f"skipping {len(existing)} already done")
    return

main()