from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text

from dotenv import load_dotenv
from pydantic import BaseModel

import os

load_dotenv()

mongo_db = os.getenv("DATABASE")

engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)

router = APIRouter()


# add to watchlist base model
class Add_Watchlist(BaseModel):
    date:str
    entry_price : float
    Quantity:int


CARD_SQL = text("""
    SELECT s.company_name, s.sector, s.industry, s.isin,
           s.market_cap, s.business_summary,
           a.price, a.analysis_date, a.day_change_pct,
           a.python_score, a.python_action,
           a.llm_score, a.llm_bias, a.llm_action, a.reasoning, a.risks,
           a.actual_direction, a.actual_close_pct, a.matched
    FROM stocks s
    LEFT JOIN LATERAL (
        SELECT * FROM stock_analysis
        WHERE nse_symbol = s.nse_symbol
        ORDER BY analysis_date DESC LIMIT 1
    ) a ON true
    WHERE s.nse_symbol = :symbol
""")

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

# render all stocks in page
@router.get("/stocks")
def get_stock(sector: str | None = None, limit: int = 50, offset: int = 0):


    sql = text("""
        SELECT s.nse_symbol, s.company_name, s.industry, s.market_cap, s.isin,
               s.business_summary,
               COALESCE(NULLIF(s.sector, ''), 'Undefined') AS sector,
               a.price, a.day_change_pct,
               a.llm_score, a.llm_bias, a.llm_action,
               a.python_score, a.python_action,
               a.combined_action, a.combined_score, a.analysis_date
        FROM stocks s
        -- Pick only the newest analysis row per stock. ROW_NUMBER numbers each
        -- stock's rows newest-first, so rn = 1 is the latest one.
        -- LEFT JOIN keeps stocks that have no analysis yet (their columns come back null).
        LEFT JOIN (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY nse_symbol ORDER BY analysis_date DESC) AS rn
            FROM stock_analysis
        ) a ON a.nse_symbol = s.nse_symbol AND a.rn = 1
        WHERE s.is_active = 'active'
          -- No sector given means "all sectors", so this half of the OR passes.
          -- The cast is needed because Postgres can't guess the type of a bare parameter.
          AND (CAST(:sector AS TEXT) IS NULL
               OR COALESCE(NULLIF(s.sector, ''), 'Undefined') = :sector)
        -- Biggest companies first; the ones with no market cap go last.
        ORDER BY s.market_cap DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"sector": sector, "limit": limit, "offset": offset}).mappings().all()

    return [dict(r) for r in rows]

# card level info
@router.get("/card/{stock}")
def per_card(stock:str):

    with engine.connect() as conn:
        r = conn.execute(CARD_SQL, {"symbol": stock.upper()}).mappings().first()
    if r is None:
        raise HTTPException(404, f"{stock} not found")

    return {
        "company_name":  r["company_name"],
        "sector":        r["sector"] or "Undefined",
        "industry":      r["industry"],
        "market_cap":    r["market_cap"],
        "Current_Price": r["price"],
        "day_change_pct": r["day_change_pct"],
        "About":         r["business_summary"],
        "ISIN":          r["isin"],
        "date":          r["analysis_date"],
        "Raw_Analysis":  {"score": r["python_score"], "action": r["python_action"]},
        "LLM_Analysis":  {"score": r["llm_score"], "bias": r["llm_bias"],
                          "action": r["llm_action"], "reasoning": r["reasoning"],
                          "risks": r["risks"]},
        "Actual_Trend":  {"direction": r["actual_direction"],
                          "close_pct": r["actual_close_pct"],
                          "matched": r["matched"]},
    }

# full analysis
@router.get("/card/{stock}/full_analysis")
def full_analysis(stock:str):
    return {
        
    }

# add to watchlist in stock card
@router.post("/watchlist/{stock}")
def add_stock_to_watchlist(stock:str,stock_data:Add_Watchlist):
    return