CREATE TABLE IF NOT EXISTS market_data_cache (
  ticker       TEXT PRIMARY KEY,
  name         TEXT,
  currency     TEXT NOT NULL DEFAULT 'USD',
  exchange     TEXT,
  price        REAL,
  change_1d    REAL,
  change_pct_1d REAL,
  high_52w     REAL,
  low_52w      REAL,
  market_cap   REAL,
  trailing_pe  REAL,
  eps_trailing REAL,
  perf_1m      REAL,
  perf_3m      REAL,
  fetched_at   INTEGER NOT NULL
);
