-- Stock universe / metadata. One row per NSE symbol.
-- Postgres (see docker-compose.yml). Populated by Scripts/Generation/fetch_stock.py
-- or bulk-loaded from stocks_seed.csv via Scripts/Generation/seed_db.py.

CREATE TABLE IF NOT EXISTS stocks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nse_symbol TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    isin TEXT,

    sector TEXT,
    industry TEXT,
    market_cap BIGINT,          -- values exceed INT4 (e.g. RELIANCE ~1.8e13)
    nifty_markets JSONB,        -- index membership, e.g. ["NIFTY 50", "NIFTY 500"]

    listing_date DATE,
    exchange TEXT DEFAULT 'NSE',
    face_value NUMERIC(10,1),
    business_summary TEXT,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active TEXT DEFAULT 'unknown'
                CHECK (is_active IN ('active','suspended','unknown'))
);

CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);

-- Postgres has no row-level UPDATE trigger syntax like SQLite's; it needs a
-- trigger function. Shared by both tables, so it lives here (stocks.sql is
-- applied first) and stock_analysis.sql just attaches another trigger to it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stocks_updated ON stocks;
CREATE TRIGGER trg_stocks_updated
BEFORE UPDATE ON stocks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
