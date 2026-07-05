CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY,
    nse_symbol TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    isin TEXT,

    sector TEXT,
    industry TEXT,
    market_cap INTEGER,
    nifty_markets TEXT,

    listing_date TEXT,
    exchange TEXT DEFAULT 'NSE',
    face_value NUMERIC(10,1),
    business_summary TEXT,  

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TEXT DEFAULT 'unknown'
                CHECK (is_active IN ('active','suspended','unknown'))

);

CREATE TRIGGER IF NOT EXISTS trg_stocks_updated
AFTER UPDATE ON stocks
FOR EACH ROW
BEGIN
    UPDATE stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;