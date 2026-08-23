CREATE TABLE IF NOT EXISTS market_stats (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticker Text Not NUll,
    name TEXT NOT NULL,
    country Text Not NULL,
    category Text Not NULL,
    price NUMERIC(18,6) NOT NULL,
    net_change NUMERIC(18,6),
    p_change NUMERIC(10,4),     -- percent, e.g. 1.23 (not "+1.23%" — format at the API layer)
    direction TEXT CHECK (direction IN ('up','down')),
    as_of DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (ticker, as_of)      -- re-running the fetch script upserts today's row
);

CREATE INDEX IF NOT EXISTS idx_market_stats_latest
    ON market_stats(ticker, as_of DESC);

DROP TRIGGER IF EXISTS trg_market_stats_updated ON market_stats;
CREATE TRIGGER trg_market_stats_updated
BEFORE UPDATE ON market_stats
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
