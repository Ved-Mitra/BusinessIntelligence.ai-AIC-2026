/**
 * db/seed.js
 * Seeds the SQLite database from the generated CSV files.
 * Run with: node db/seed.js
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const Database = require('better-sqlite3');
const { parse } = require('csv-parse/sync');

const DB_PATH     = path.join(__dirname, '..', '..', 'data', 'db.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_DIR    = path.join(__dirname, '..', '..', 'data', 'seed');

// Ensure data dir exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Apply schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);
console.log('Schema applied.');

function loadCSV(filename) {
  const raw = fs.readFileSync(path.join(SEED_DIR, filename), 'utf8');
  return parse(raw, { columns: true, cast: true, skip_empty_lines: true });
}

// ── Helper: upsert source_freshness ────────────────────────────────────────
const upsertFreshness = db.prepare(`
  INSERT INTO source_freshness(source_name, last_loaded_at, row_count, cadence)
  VALUES (?, datetime('now'), ?, ?)
  ON CONFLICT(source_name) DO UPDATE SET
    last_loaded_at = excluded.last_loaded_at,
    row_count      = excluded.row_count
`);

// ── 1. Sales Daily ──────────────────────────────────────────────────────────
console.log('Seeding sales_daily ...');
db.exec('DELETE FROM sales_daily');

const insertSale = db.prepare(`
  INSERT INTO sales_daily
    (sale_id, date, year, month, week, product_id, product_name,
     is_new_product, region, channel, units_sold, unit_price, revenue,
     cogs, gross_profit, sessions, new_customers)
  VALUES
    (@sale_id, @date, @year, @month, @week, @product_id, @product_name,
     @is_new_product, @region, @channel, @units_sold, @unit_price, @revenue,
     @cogs, @gross_profit, @sessions, @new_customers)
`);

const salesData = loadCSV('sales_daily.csv');
const insertManySales = db.transaction((rows) => {
  for (const row of rows) insertSale.run(row);
});
insertManySales(salesData);
upsertFreshness.run('sales_daily', salesData.length, 'daily');
console.log(`  -> ${salesData.length} rows inserted.`);

// ── 2. Marketing Weekly ──────────────────────────────────────────────────────
console.log('Seeding marketing_weekly ...');
db.exec('DELETE FROM marketing_weekly');

const insertMkt = db.prepare(`
  INSERT INTO marketing_weekly
    (week_start, week_end, year, week_num, month, channel,
     spend_usd, impressions, clicks, ctr_pct)
  VALUES
    (@week_start, @week_end, @year, @week_num, @month, @channel,
     @spend_usd, @impressions, @clicks, @ctr_pct)
`);

const mktData = loadCSV('marketing_weekly.csv');
const insertManyMkt = db.transaction((rows) => {
  for (const row of rows) insertMkt.run(row);
});
insertManyMkt(mktData);
upsertFreshness.run('marketing_weekly', mktData.length, 'weekly');
console.log(`  -> ${mktData.length} rows inserted.`);

// ── 3. Financials Monthly ────────────────────────────────────────────────────
console.log('Seeding financials_monthly ...');
db.exec('DELETE FROM financials_monthly');

const insertFin = db.prepare(`
  INSERT OR REPLACE INTO financials_monthly
    (year, month, month_name, total_opex_usd, ebitda_usd, headcount,
     external_events, data_quality_flag)
  VALUES
    (@year, @month, @month_name, @total_opex_usd, @ebitda_usd, @headcount,
     @external_events, @data_quality_flag)
`);

const finData = loadCSV('financials_monthly.csv');
const insertManyFin = db.transaction((rows) => {
  for (const row of rows) insertFin.run(row);
});
insertManyFin(finData);
upsertFreshness.run('financials_monthly', finData.length, 'monthly');
console.log(`  -> ${finData.length} rows inserted.`);

db.close();
console.log('\nDatabase seeded successfully at:', DB_PATH);
