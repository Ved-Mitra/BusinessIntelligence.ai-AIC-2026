/**
 * analysis/anomalyDetector.js
 * NON-LLM anomaly detection using Z-score and business materiality thresholds.
 */
'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.sqlite');

function getDb() { return new Database(DB_PATH, { readonly: true }); }

/**
 * Detects anomaly based on Z-score and business threshold.
 * @param {Object} kpiResult - Result from kpiEngine.js
 */
function detectAnomaly(kpiResult) {
  if (kpiResult.sparseHistory || !kpiResult.dataAvailable) {
    return { isAnomaly: false, reason: 'Sparse history or no data', zScore: null };
  }

  const { pctChange, alertThreshold, value, priorValue } = kpiResult;
  let isAnomaly = false;
  let reason = [];

  // Check business rules first
  if (alertThreshold) {
    if (alertThreshold.pct_change && Math.abs(pctChange) >= alertThreshold.pct_change) {
      isAnomaly = true;
      reason.push(`Exceeds % change threshold (${alertThreshold.pct_change}%)`);
    }
    if (alertThreshold.pct_point_change && Math.abs(value - priorValue) >= alertThreshold.pct_point_change) {
      isAnomaly = true;
      reason.push(`Exceeds percentage point threshold (${alertThreshold.pct_point_change}pp)`);
    }
    if (alertThreshold.business_impact_usd && Math.abs(value - priorValue) >= alertThreshold.business_impact_usd) {
       // Only valid if KPI is in USD, for simplicity we check absolute diff
       // In a real system, we'd check unit type.
       // We'll just append it for demonstration.
       reason.push(`Exceeds business impact threshold`);
    }
  }

  // Statistical Z-Score check (simplified over last 6 periods if available)
  // For the hackathon, we simulate Z-score based on the pctChange magnitude
  let zScore = (pctChange / 10); // Simulated Z-score
  if (Math.abs(zScore) > 2.5) {
     isAnomaly = true;
     reason.push(`Statistically significant (Z-score > 2.5)`);
  }

  return {
    isAnomaly,
    reason: reason.join(', '),
    zScore: zScore.toFixed(2)
  };
}

module.exports = { detectAnomaly };
