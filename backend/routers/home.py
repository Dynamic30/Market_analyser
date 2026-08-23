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

mongo_db = os.getenv("DATABASE")

@router.get("/basic_top_bar")
def page_metadata():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT DISTINCT ON (ticker) ticker, name, price, p_change, direction, as_of
            FROM market_stats
            ORDER BY ticker, as_of DESC
        """)).mappings().all()

    return {
        "date":date.today().strftime("%A, %d %B %Y"),
        "as_of": rows[0]["as_of"] if rows else None,
        "market_data": rows
    }

# ger all sector for dropdown
@router.get("/sector")
def get_all_sector():

    with engine.connect() as conn:
        data = conn.execute(text("""
                SELECT DISTINCT COALESCE(NULLIF(sector, ''), 'Undefined') AS sector
                FROM stocks
                ORDER BY sector
            """)).scalars().all()

    return data

@router.get("/top_pick/{sector}")
def top_pick(sector):
    return