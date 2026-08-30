/**
 * security/entitlements.js
 * Role-based access control (RBAC) for KPIs and data slices.
 * NON-LLM — enforced at both the SQL query layer and the LLM prompt layer.
 *
 * Roles:
 *   ceo                     - All KPIs, all regions, aggregated only
 *   analyst                 - All KPIs, all regions, full granularity
 *   regional_manager_north  - revenue + conversion_rate, North region only
 *   regional_manager_south  - revenue + conversion_rate, South region only
 */

'use strict';

const ENTITLEMENTS = {
  ceo: {
    allowedKpis:    ['revenue', 'gross_margin', 'cac', 'conversion_rate', 'new_product_gmv'],
    regionFilter:   null,       // all regions
    maxGrain:       'monthly',  // no raw daily rows
    rawDataAccess:  false,
    label:          'Chief Executive Officer',
  },
  analyst: {
    allowedKpis:    ['revenue', 'gross_margin', 'cac', 'conversion_rate', 'new_product_gmv'],
    regionFilter:   null,       // all regions
    maxGrain:       'daily',    // full granularity
    rawDataAccess:  true,
    label:          'BI Analyst',
  },
  regional_manager_north: {
    allowedKpis:    ['revenue', 'conversion_rate'],
    regionFilter:   'North',
    maxGrain:       'daily',
    rawDataAccess:  false,
    label:          'Regional Manager — North',
  },
  regional_manager_south: {
    allowedKpis:    ['revenue', 'conversion_rate'],
    regionFilter:   'South',
    maxGrain:       'daily',
    rawDataAccess:  false,
    label:          'Regional Manager — South',
  },
};

/**
 * Get entitlements for a persona. Throws 401 if persona is unknown.
 * @param {string} persona
 * @returns {Object}
 */
function getEntitlements(persona) {
  const ent = ENTITLEMENTS[persona];
  if (!ent) {
    const err = new Error(`Unknown persona: ${persona}`);
    err.statusCode = 401;
    throw err;
  }
  return ent;
}

/**
 * Check if a persona can access a specific KPI.
 * @param {string} persona
 * @param {string} kpiId
 * @returns {boolean}
 */
function canAccessKpi(persona, kpiId) {
  const ent = ENTITLEMENTS[persona];
  return ent ? ent.allowedKpis.includes(kpiId) : false;
}

/**
 * Get all valid persona names.
 * @returns {string[]}
 */
function getPersonas() {
  return Object.entries(ENTITLEMENTS).map(([id, ent]) => ({
    id,
    label: ent.label,
    allowedKpis: ent.allowedKpis,
    regionFilter: ent.regionFilter,
  }));
}

module.exports = { getEntitlements, canAccessKpi, getPersonas };
