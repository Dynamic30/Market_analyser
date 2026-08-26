from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, text

from dotenv import load_dotenv
from backend.schemas import Add_Watchlist,CardBasicData, CardHistoryAnalysis, StockCard, SectorAnalysisCheck
import os

load_dotenv()

mongo_db = os.getenv("DATABASE")

engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)

router = APIRouter()


CARD_META_SQL = text("""
    SELECT s.company_name, s.nse_symbol, s.isin, s.market_cap, s.business_summary,
           COALESCE(NULLIF(s.sector, ''), 'Undefined') AS sector,
           a.price, a.analysis_date
    FROM stocks s
    LEFT JOIN LATERAL (
        SELECT price, analysis_date FROM stock_analysis
        WHERE nse_symbol = s.nse_symbol
        ORDER BY analysis_date DESC LIMIT 1
    ) a ON true
    WHERE s.nse_symbol = :symbol
""")

# Every analysis row, newest first — backed by idx_analysis_symbol_date.
CARD_HISTORY_SQL = text("""
    SELECT analysis_date,
           analysis_for AS analysis_for_date,
           python_score, python_action,
           overall_bias_score, short_term_action, long_term_action,
           combined_score, combined_action,
           actual_close_pct,
           price,
           COALESCE(matched, 'pending') AS matched
    FROM stock_analysis
    WHERE nse_symbol = :symbol
    ORDER BY analysis_date DESC
""")

SECTOR_CHECK_SQL = text("""
WITH sector_symbols AS (
    SELECT nse_symbol
    FROM stocks
    WHERE is_active = 'active'
      AND COALESCE(NULLIF(sector, ''), 'Undefined') = :sector
),
ranked AS (
    SELECT
        sa.nse_symbol,
        sa.analysis_date,
        sa.combined_action,
        sa.price,
        ROW_NUMBER() OVER (PARTITION BY sa.nse_symbol ORDER BY sa.analysis_date DESC) AS rn
    FROM stock_analysis sa
    WHERE sa.nse_symbol IN (SELECT nse_symbol FROM sector_symbols)
),
yesterday AS (
    SELECT nse_symbol, analysis_date, combined_action, price
    FROM ranked WHERE rn = 2
),
today AS (
    SELECT nse_symbol, price
    FROM ranked WHERE rn = 1
)
SELECT
    :sector AS sector,
    (SELECT COUNT(*) FROM sector_symbols) AS total_stocks,
    COUNT(y.nse_symbol) AS predictions_made,
    COUNT(*) FILTER (WHERE
        (y.combined_action IN ('BUY', 'HOLD') AND t.price >= y.price)
        OR (y.combined_action = 'SELL' AND t.price < y.price)
    ) AS correct_predictions,
    MAX(y.analysis_date) AS last_evaluated_date
FROM yesterday y
LEFT JOIN today t ON y.nse_symbol = t.nse_symbol;



""")



def fmt_market_cap(n) -> str:
    """BIGINT rupees -> the "18.4L Cr" form the cards show (mirrors fmtMarketCap in app.js)."""
    if not n:
        return "—"
    cr = n / 1e7                        # 1 crore = 10^7
    if cr >= 1e5: return f"{cr / 1e5:.1f}L Cr"
    if cr >= 1e3: return f"{cr / 1e3:.1f}K Cr"
    return f"{cr:.0f} Cr"



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
               a.overall_bias_score, a.overall_bias_label, a.short_term_action,
               a.python_score, a.python_action,
               a.llm_reasoning, a.python_reasoning,
               a.combined_action, a.combined_score, a.analysis_date, a.analysis_for
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
@router.get("/card/{stock}", response_model=StockCard)
def get_stock_card(stock: str):
    symbol = stock.upper()
    with engine.connect() as conn:
        meta = conn.execute(CARD_META_SQL, {"symbol": symbol}).mappings().first()
        if meta is None:
            raise HTTPException(404, f"{stock} not found")
        history = [dict(r) for r in conn.execute(CARD_HISTORY_SQL, {"symbol": symbol}).mappings().all()]

    # verify previous predictions using next day's price
    for i in range(len(history) - 1):
        today = history[i]
        yesterday = history[i + 1]

        if today.get("price") and yesterday.get("price"):
            pct = round((today["price"] - yesterday["price"]) / yesterday["price"] * 100, 2)
            yesterday["actual_close_pct"] = pct
            yesterday["actual_direction"] = "up" if pct > 0 else "down" if pct < 0 else "flat"

            action = yesterday.get("combined_action")
            if action in ("BUY", "HOLD") and pct >= 0:
                yesterday["matched"] = "true"
            elif action == "SELL" and pct < 0:
                yesterday["matched"] = "true"
            elif action:
                yesterday["matched"] = "false"


    return StockCard(
        metadata=CardBasicData(
            date=meta["analysis_date"],
            company_name=meta["company_name"],
            nse_symbol=meta["nse_symbol"],
            sector=meta["sector"],
            market_cap=fmt_market_cap(meta["market_cap"]),
            current_price=meta["price"],
            about=meta["business_summary"],
            ISIN=meta["isin"],
        ),
        history=[CardHistoryAnalysis(**r) for r in history],
    )

@router.get("/last_analysis_check/{sector}", response_model=SectorAnalysisCheck)
def last_analysis_check(sector: str):
    sector = sector.strip()
    with engine.connect() as conn:
        row = conn.execute(SECTOR_CHECK_SQL, {"sector": sector}).mappings().first()

    total = row["total_stocks"] or 0
    made = row["predictions_made"] or 0
    correct = row["correct_predictions"] or 0

    return SectorAnalysisCheck(
        sector=sector,
        total_stocks=total,
        predictions_made=made,
        correct_predictions=correct,
        accuracy_pct=round(correct / made * 100, 2) if made else 0.0,
        last_evaluated_date=row["last_evaluated_date"],
    )


# full analysis
@router.get("/card/{stock}/full_analysis")
def full_analysis(stock:str):
    return {
        
    }

# add to watchlist in stock card
@router.post("/watchlist/{stock}")
def add_stock_to_watchlist(stock:str,stock_data:Add_Watchlist):
    return

