/**
 * kpi/kpiEngine.js
 * Executes SQL-based KPI calculations against the SQLite database.
 * NON-LLM — all numbers come from deterministic SQL queries.
 *
 * Returns per-KPI values for a given year/month, including:
 *   - current period value
 *   - prior period value (for % change)
 *   - % change
 *   - data lineage metadata
 */

'use strict';

const path           = require('path');
const Database       = require('better-sqlite3');
const { getContract, getAllContracts } = require('./contractLoader');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.sqlite');

let _db = null;
function getDb() {
  if (!_db) _db = new Database(DB_PATH, { readonly: true });
  return _db;
}

/**
 * Calculate a single KPI for a specific period.
 *
 * @param {string} kpiId  - KPI identifier (e.g. 'revenue')
 * @param {number} year
 * @param {number} month
 * @param {Object} [filters] - Optional entitlement filters e.g. { region: 'North' }
 * @returns {Object} { kpiId, value, priorValue, pctChange, contract, dataAvailable }
 */
function calculateKpi(kpiId, year, month, filters = {}) {
  const contract = getContract(kpiId);
  if (!contract) throw new Error(`Unknown KPI: ${kpiId}`);

  const db = getDb();

  // Build region filter clause if applicable
  const regionClause = (filters.region && contract.region_filter_key)
    ? ` AND region = '${filters.region.replace(/'/g, "''")}'`
    : '';

  // Inject region clause into SQL (simple string injection — safe as region comes from entitlements)
  const rawSql    = contract.formula.sql;
  const currentSql = injectRegionFilter(rawSql, regionClause);
  const priorSql   = injectRegionFilter(rawSql, regionClause);

  // Calculate prior period (handle January → December of prior year)
  const priorYear  = month === 1 ? year - 1 : year;
  const priorMonth = month === 1 ? 12 : month - 1;

  let currentValue = null;
  let priorValue   = null;

  try {
    const currentRow = db.prepare(currentSql).get({ year, month });
    currentValue = currentRow ? (currentRow.value ?? null) : null;

    const priorRow = db.prepare(priorSql).get({ year: priorYear, month: priorMonth });
    priorValue = priorRow ? (priorRow.value ?? null) : null;
  } catch (err) {
    console.error(`[kpiEngine] SQL error for ${kpiId}:`, err.message);
  }

  const pctChange = (currentValue !== null && priorValue !== null && priorValue !== 0)
    ? parseFloat(((currentValue - priorValue) / Math.abs(priorValue) * 100).toFixed(2))
    : null;

  // Data availability (sparse history check)
  const dataAvailable = currentValue !== null && currentValue > 0;

  return {
    kpiId,
    name:         contract.name,
    description:  contract.description,
    value:        currentValue,
    priorValue,
    pctChange,
    period:       { year, month },
    priorPeriod:  { year: priorYear, month: priorMonth },
    dataAvailable,
    sparseHistory: contract.sparse_history || false,
    cadence:      contract.cadence,
    primarySource: contract.primary_source,
    lineage:      contract.lineage,
    alertThreshold: contract.alert_threshold,
    historyWarning: contract.sparse_history ? contract.history_warning_message : null,
  };
}

/**
 * Calculate all accessible KPIs for a given persona and period.
 *
 * @param {string} persona
 * @param {number} year
 * @param {number} month
 * @param {Object} entitlements - From entitlements.js
 * @returns {Array} Array of KPI result objects
 */
function calculateAllKpis(persona, year, month, entitlements) {
  const contracts = getAllContracts();
  const results   = [];

  for (const contract of contracts) {
    // Check persona access
    if (!contract.personas_allowed.includes(persona)) continue;

    const filters = {};
    if (entitlements.regionFilter) filters.region = entitlements.regionFilter;

    try {
      const result = calculateKpi(contract.id, year, month, filters);
      results.push(result);
    } catch (err) {
      console.error(`[kpiEngine] Error calculating ${contract.id}:`, err.message);
    }
  }

  return results;
}

/**
 * Get source freshness metadata from the DB.
 * @returns {Array}
 */
function getSourceFreshness() {
  const db = getDb();
  return db.prepare('SELECT * FROM source_freshness').all();
}

/**
 * Inject a WHERE clause addition into a SQL string.
 * Uses the 's' (dotAll) flag so . matches newlines in multi-line SQL.
 * Only injects into the outermost sales_daily WHERE clause,
 * not into subqueries that reference other tables.
 */
function injectRegionFilter(sql, regionClause) {
  if (!regionClause) return sql;
  // Match: FROM sales_daily WHERE ... up to either ) or end-of-string
  // 's' flag makes . match newlines; 'i' for case-insensitivity
  return sql.replace(
    /(FROM\s+sales_daily\s+WHERE\s+(?:(?!\bFROM\b).)*?)(\s*(?=\))|$)/si,
    (match, p1, p2) => `${p1}${regionClause}${p2}`
  );
}

module.exports = { calculateKpi, calculateAllKpis, getSourceFreshness };
