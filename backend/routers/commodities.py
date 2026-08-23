from fastapi import APIRouter
from dotenv import load_dotenv
import os
from datetime import date

from sqlalchemy import create_engine, text
import yfinance as yf

load_dotenv()

engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)


router = APIRouter()

# Latest snapshot per ticker. DISTINCT ON keeps the first row of each ticker
# group, so ordering by as_of DESC within the group picks the newest one —
# this is what idx_commodities_latest(ticker, as_of DESC) backs.
LATEST_SQL = text("""
    SELECT DISTINCT ON (ticker) ticker, name, category, unit,
           price, net_change, p_change, direction, as_of
    FROM commodities
    WHERE (CAST(:sector AS TEXT) IS NULL OR category = :sector)
    ORDER BY ticker, as_of DESC
""")


# sector is the UI's category filter — Metals / Energy / Agriculture / Livestock,
# or "all" for the unfiltered view.
@router.get("/{sector}/commodity")
def get_commodities(sector: str):
    want = None if sector.lower() == "all" else sector
    with engine.connect() as conn:
        rows = conn.execute(LATEST_SQL, {"sector": want}).mappings().all()

    return {
        # Tickers can lag each other by a day, so report the newest as_of
        # present rather than whichever ticker happens to sort first.
        "as_of": max((r["as_of"] for r in rows), default=None),
        "commodities": rows,
    }

