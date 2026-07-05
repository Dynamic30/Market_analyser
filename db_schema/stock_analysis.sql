CREATE TABLE IF NOT EXISTS stock_analysis (
    id INTEGER PRIMARY KEY,
    nse_symbol TEXT NOT NULL,
    analysis_date TEXT NOT NULL,


    python_score REAL,
    python_action TEXT CHECK (python_action IN ('BUY','SELL','HOLD','NEUTRAL')),

    llm_score REAL,
    llm_bias TEXT CHECK (llm_bias IN ('Bullish','Bearish','Neutral','Mixed')),
    llm_action TEXT CHECK (llm_action IN ('BUY','SELL','HOLD','NEUTRAL')),
    reasoning TEXT,
    risks TEXT,
    hold_duration TEXT,
    hold_duration_reason TEXT,
    hold_duration_days INTEGER,

    combined_action TEXT CHECK (combined_action IN ('BUY','SELL','HOLD','NEUTRAL')),
    combined_score REAL,

    actual_close_pct REAL,
    actual_direction TEXT CHECK (actual_direction IN ('up','down','flat')),
    matched TEXT DEFAULT 'pending'
            CHECK (matched IN ('true','false','pending')),
    
    price REAL, -- close on analysis_date (from meta_data.current_price)
    day_change_pct REAL, -- that day's % move (add later if you don't compute it yet)
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (nse_symbol, analysis_date) ,
    FOREIGN KEY (nse_symbol) REFERENCES stocks(nse_symbol)

);

CREATE INDEX IF NOT EXISTS idx_analysis_date ON stock_analysis(analysis_date);

CREATE TRIGGER IF NOT EXISTS trg_stock_analysis_updated
AFTER UPDATE ON stock_analysis
FOR EACH ROW
BEGIN
    UPDATE stock_analysis SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
