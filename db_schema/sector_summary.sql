-- Weekly rolling sentiment summary — one row per (sector, run).
-- One cheap LLM call per sector distills recent news mood into a short paragraph,
-- prepended to each stock's Phase A prompt as shared sector context. "Rolling":
-- each run summarizes this run's is_top_news headlines PLUS the previous summary
-- for that sector (only the immediately previous one — it already absorbed all
-- prior). First run for a sector has no previous and is built from headlines alone.
-- Intended cadence: weekly/biweekly, not nightly. Depends on stocks.sql for the
-- shared set_updated_at() trigger function.

CREATE TABLE IF NOT EXISTS sector_summary (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sector TEXT NOT NULL,
    summary TEXT NOT NULL,

    n_articles_used INTEGER,     -- headlines fed this run; also flags if is_top_news needs a cap
    model TEXT,                  -- which LLM produced it (model-swap tracking)
    based_on_previous BOOLEAN DEFAULT FALSE,  -- was a prior summary chained in?

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- "latest summary for this sector before now" lookup
CREATE INDEX IF NOT EXISTS idx_sector_summary_latest
    ON sector_summary(sector, created_at DESC);

DROP TRIGGER IF EXISTS trg_sector_summary_updated ON sector_summary;
CREATE TRIGGER trg_sector_summary_updated
BEFORE UPDATE ON sector_summary
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();