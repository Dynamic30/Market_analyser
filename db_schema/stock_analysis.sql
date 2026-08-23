-- One row per (stock, analysis date). Written by the nightly pipeline:
-- raw/rule-based scores, LLM scores, the combined verdict, and — filled in
-- afterwards — what the stock actually did, so past calls can be scored.
-- Depends on stocks.sql (FK + the shared set_updated_at() trigger function).

CREATE TABLE IF NOT EXISTS stock_analysis (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nse_symbol TEXT NOT NULL,
    analysis_date DATE NOT NULL,

    python_score REAL,
    python_action TEXT CHECK (python_action IN ('BUY','SELL','HOLD','NEUTRAL')),
    -- Sub-scores behind python_score (each 0-100). The third component is
    -- institutional flow, not news sentiment — news belongs to the LLM pass.
    python_reasoning TEXT,

    -- llm_score REAL,
    -- llm_bias TEXT CHECK (llm_bias IN ('Bullish','Bearish','Neutral','Mixed')),
    -- llm_action TEXT CHECK (llm_action IN ('BUY','SELL','HOLD','NEUTRAL')),
    -- reasoning TEXT,
    risks JSONB,                -- key_risks[] from the LLM output
    hold_duration TEXT,
    -- hold_duration_reason TEXT,
    -- hold_duration_days INTEGER,
    news_bias_score REAL,
    news_bias_label TEXT CHECK (news_bias_label IN ('Bullish','Bearish','Neutral','Mixed')),
    analysis_bias_score REAL,
    analysis_bias_label TEXT CHECK (analysis_bias_label IN ('Bullish','Bearish','Neutral','Mixed')),
    overall_bias_score REAL,
    overall_bias_label TEXT CHECK (overall_bias_label IN ('Bullish','Bearish','Neutral','Mixed')),

    short_term_action TEXT CHECK (short_term_action IN ('BUY','SELL','HOLD','NEUTRAL')),
    long_term_action  TEXT CHECK (long_term_action  IN ('BUY','SELL','HOLD','NEUTRAL')),

    sentiment_sector_score REAL,
    sentiment_sector_rank INTEGER,
    sentiment_composite_score REAL,
    sentiment_composite_rank INTEGER,
    n_articles_used SMALLINT,

    llm_reasoning JSONB,   -- {technical, fundamental, sentiment, synthesis}
    price_ranges JSONB,    -- {buy_range, sell_range_short, sell_range_positional, stop_loss}

    combined_action TEXT CHECK (combined_action IN ('BUY','SELL','HOLD','NEUTRAL')),
    combined_score REAL,

    actual_close_pct REAL,
    actual_direction TEXT CHECK (actual_direction IN ('up','down','flat')),
    matched TEXT DEFAULT 'pending'
            CHECK (matched IN ('true','false','pending')),

    price REAL,                 -- close on analysis_date (meta_data.current_price)
    day_change_pct REAL,        -- that day's % move

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (nse_symbol, analysis_date),
    FOREIGN KEY (nse_symbol) REFERENCES stocks(nse_symbol)
);

-- The CREATE above only fires on a fresh database. These keep an already-created
-- stock_analysis in sync when columns are added, since seed_db.apply_schema()
-- re-runs this whole file every time.
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS python_reasoning TEXT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS mom_12_1 DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS vol_60 DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS beta_252 DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS delivery_pct_20 DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS roce DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS de_ratio DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS earnings_yield DOUBLE PRECISION;

ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS sector_score DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS sector_rank INTEGER;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS composite_score DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS composite_rank INTEGER;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS n_factors_used SMALLINT;

ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS adj_close DOUBLE PRECISION;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS passed_universe_gate BOOLEAN;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS eval_horizon_days INTEGER;

-- sentiments columns
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS news_bias_score REAL;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS news_bias_label TEXT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS analysis_bias_score REAL;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS analysis_bias_label TEXT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS overall_bias_score REAL;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS overall_bias_label TEXT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS short_term_action TEXT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS long_term_action TEXT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS sentiment_sector_score REAL;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS sentiment_sector_rank INTEGER;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS sentiment_composite_score REAL;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS sentiment_composite_rank INTEGER;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS n_articles_used SMALLINT;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS llm_reasoning JSONB;
ALTER TABLE stock_analysis ADD COLUMN IF NOT EXISTS price_ranges JSONB;

CREATE INDEX IF NOT EXISTS idx_analysis_date ON stock_analysis(analysis_date);
-- Backs the "latest analysis per symbol" join in backend/routers/all_stocks.py
CREATE INDEX IF NOT EXISTS idx_analysis_symbol_date
    ON stock_analysis(nse_symbol, analysis_date DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_date_gate
    ON stock_analysis(analysis_date, passed_universe_gate)
    WHERE passed_universe_gate;


DROP TRIGGER IF EXISTS trg_stock_analysis_updated ON stock_analysis;
CREATE TRIGGER trg_stock_analysis_updated
BEFORE UPDATE ON stock_analysis
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


