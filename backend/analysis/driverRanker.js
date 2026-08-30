/**
 * analysis/driverRanker.js
 * Rank drivers by absolute contribution percentage.
 */
'use strict';

/**
 * Rank drivers by magnitude of contribution.
 * @param {Array} drivers
 */
function rankDrivers(drivers) {
  if (!drivers || drivers.length === 0) return [];
  
  return drivers.sort((a, b) => Math.abs(b.contribution_pct) - Math.abs(a.contribution_pct));
}

module.exports = { rankDrivers };
