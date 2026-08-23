CREATE TABLE IF NOT EXISTS commodities(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name Text Not NULL,
    ticker Text Not NULL,
    category Text Not NULL,
    unit TEXT,
    price NUMERIC(18,6) NOT NULL,
    net_change NUMERIC(18,6),
    p_change NUMERIC(10,4),
    direction TEXT CHECK (direction IN ('up','down')),
    as_of DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (ticker, as_of)      -- re-running the fetch script upserts today's row
);

CREATE INDEX IF NOT EXISTS idx_commodities_latest
    ON commodities(ticker, as_of DESC);

DROP TRIGGER IF EXISTS trg_commodities_updated ON commodities;
CREATE TRIGGER trg_commodities_updated
BEFORE UPDATE ON commodities
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();