"""
Apply the SQL schema and bulk-load stocks_seed.csv into Postgres.

Rebuilds the stock universe from the committed CSV instead of the SQLite file,
so any machine can reach the same state with `docker compose up -d` + this script.

    python Scripts/Generation/seed_db.py

Safe to re-run: the schema uses IF NOT EXISTS and the insert upserts on nse_symbol.
"""

import csv
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

PROJECT_ROOT = Path(__file__).parent.parent.parent
SCHEMA_FILES = [
    PROJECT_ROOT / "db_schema" / "stocks.sql",          # must run first — defines set_updated_at()
    PROJECT_ROOT / "db_schema" / "stock_analysis.sql",
    PROJECT_ROOT / "db_schema" / "sector_summary.sql", # weekly rolling sentiment summary
    PROJECT_ROOT / "db_schema" / "market.sql",
    PROJECT_ROOT / "db_schema" / "commodities.sql",

]
SEED_CSV = PROJECT_ROOT / "etc" / "stocks_seed.csv"

engine = create_engine(
    os.getenv("SQL_DB", "postgresql+psycopg://market:market@localhost:5432/market_analyser")
)


def clean(value):
    """CSV can't express NULL, so blanks arrive as ''. Postgres wants real NULLs."""
    value = (value or "").strip()
    return value or None


def to_int(value):
    value = clean(value)
    if value is None:
        return None
    # market_cap is written as a float string ("7211149824.0") by yfinance
    return int(float(value))


def to_float(value):
    value = clean(value)
    return float(value) if value is not None else None


def row_to_params(row):
    """One CSV row -> insert params. `id`/`created_at`/`updated_at` are dropped
    so Postgres generates them."""
    markets = clean(row["nifty_markets"])
    return {
        "nse_symbol":       clean(row["nse_symbol"]),
        "company_name":     clean(row["company_name"]),
        "isin":             clean(row["isin"]),
        "sector":           clean(row["sector"]),
        "industry":         clean(row["industry"]),
        "market_cap":       to_int(row["market_cap"]),
        # Stored as JSONB; the CSV already holds a JSON array string.
        "nifty_markets":    json.dumps(json.loads(markets)) if markets else None,
        "listing_date":     clean(row["listing_date"]),
        "exchange":         clean(row["exchange"]) or "NSE",
        "face_value":       to_float(row["face_value"]),
        "business_summary": clean(row["business_summary"]),
        "is_active":        clean(row["is_active"]) or "unknown",
    }


INSERT_SQL = text("""
    INSERT INTO stocks (nse_symbol, company_name, isin, sector, industry,
                        market_cap, nifty_markets, listing_date, exchange,
                        face_value, business_summary, is_active)
    VALUES (:nse_symbol, :company_name, :isin, :sector, :industry,
            :market_cap, CAST(:nifty_markets AS JSONB), CAST(:listing_date AS DATE), :exchange,
            :face_value, :business_summary, :is_active)
    ON CONFLICT (nse_symbol) DO UPDATE SET
        company_name     = EXCLUDED.company_name,
        isin             = EXCLUDED.isin,
        sector           = EXCLUDED.sector,
        industry         = EXCLUDED.industry,
        market_cap       = EXCLUDED.market_cap,
        nifty_markets    = EXCLUDED.nifty_markets,
        face_value       = EXCLUDED.face_value,
        business_summary = EXCLUDED.business_summary,
        is_active        = EXCLUDED.is_active
""")


def apply_schema(conn):
    for path in SCHEMA_FILES:
        conn.execute(text(path.read_text()))
        print(f"schema applied -> {path.name}")


def main():
    with SEED_CSV.open(encoding="utf-8") as f:
        rows = [row_to_params(r) for r in csv.DictReader(f)]
    print(f"read {len(rows)} rows from {SEED_CSV.name}")

    with engine.begin() as conn:
        apply_schema(conn)
        conn.execute(INSERT_SQL, rows)          # executemany
        total = conn.execute(text("SELECT COUNT(*) FROM stocks")).scalar_one()

    print(f"seeded -> stocks now holds {total} rows")


if __name__ == "__main__":
    main()
