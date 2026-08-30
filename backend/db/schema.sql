-- BusinessIntelligence.ai — SQLite Schema
-- Three source tables mirror the three CSV grains.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Source A: Daily Sales ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_daily (
    sale_id         INTEGER PRIMARY KEY,
    date            TEXT    NOT NULL,   -- ISO 8601
    year            INTEGER NOT NULL,
    month           INTEGER NOT NULL,
    week            INTEGER NOT NULL,
    product_id      TEXT    NOT NULL,
    product_name    TEXT    NOT NULL,
    is_new_product  INTEGER NOT NULL DEFAULT 0,  -- 0|1
    region          TEXT    NOT NULL,
    channel         TEXT    NOT NULL,
    units_sold      INTEGER NOT NULL DEFAULT 0,
    unit_price      REAL    NOT NULL DEFAULT 0,
    revenue         REAL    NOT NULL DEFAULT 0,
    cogs            REAL    NOT NULL DEFAULT 0,
    gross_profit    REAL    NOT NULL DEFAULT 0,
    sessions        INTEGER NOT NULL DEFAULT 0,
    new_customers   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sales_date    ON sales_daily(date);
CREATE INDEX IF NOT EXISTS idx_sales_month   ON sales_daily(year, month);
CREATE INDEX IF NOT EXISTS idx_sales_region  ON sales_daily(region);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales_daily(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_new     ON sales_daily(is_new_product);

-- ── Source B: Weekly Marketing ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_weekly (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start  TEXT    NOT NULL,
    week_end    TEXT    NOT NULL,
    year        INTEGER NOT NULL,
    week_num    INTEGER NOT NULL,
    month       INTEGER NOT NULL,
    channel     TEXT    NOT NULL,
    spend_usd   REAL    NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks      INTEGER NOT NULL DEFAULT 0,
    ctr_pct     REAL    NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mkt_month   ON marketing_weekly(year, month);
CREATE INDEX IF NOT EXISTS idx_mkt_channel ON marketing_weekly(channel);

-- ── Source C: Monthly Financials ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financials_monthly (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    year                INTEGER NOT NULL,
    month               INTEGER NOT NULL,
    month_name          TEXT    NOT NULL,
    total_opex_usd      REAL    NOT NULL DEFAULT 0,
    ebitda_usd          REAL    NOT NULL DEFAULT 0,
    headcount           INTEGER NOT NULL DEFAULT 0,
    external_events     TEXT    NOT NULL DEFAULT '',
    data_quality_flag   TEXT    NOT NULL DEFAULT 'OK',  -- OK | PARTIAL | MISSING
    UNIQUE(year, month)
);

-- ── Feedback Store ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    narrative_id    TEXT    NOT NULL,
    kpi_id          TEXT    NOT NULL,
    persona         TEXT    NOT NULL,
    rating          TEXT    NOT NULL,   -- thumbs_up | thumbs_down
    correction_text TEXT    NOT NULL DEFAULT '',
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Telemetry ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id          TEXT    NOT NULL,
    timestamp           TEXT    NOT NULL DEFAULT (datetime('now')),
    kpi_id              TEXT    NOT NULL,
    persona             TEXT    NOT NULL,
    total_latency_ms    INTEGER NOT NULL DEFAULT 0,
    non_llm_latency_ms  INTEGER NOT NULL DEFAULT 0,
    llm_latency_ms      INTEGER NOT NULL DEFAULT 0,
    model               TEXT    NOT NULL DEFAULT '',
    input_tokens        INTEGER NOT NULL DEFAULT 0,
    output_tokens       INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd  REAL    NOT NULL DEFAULT 0,
    llm_calls           INTEGER NOT NULL DEFAULT 0,
    cache_hit           INTEGER NOT NULL DEFAULT 0
);

-- ── Metadata: source freshness ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS source_freshness (
    source_name     TEXT    PRIMARY KEY,
    last_loaded_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    row_count       INTEGER NOT NULL DEFAULT 0,
    cadence         TEXT    NOT NULL DEFAULT ''
);
