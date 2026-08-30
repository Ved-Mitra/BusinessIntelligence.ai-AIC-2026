/**
 * analysis/anomalyDetector.js
 * NON-LLM anomaly detection using Z-score and business materiality thresholds.
 * Uses rules defined in KPI YAML contracts (pct_change, pct_point_change, business_impact_usd).
 */
'use strict';

/**
 * Detects whether a KPI movement is anomalous.
 * @param {Object} kpiResult - Result from kpiEngine.calculateKpi()
 * @returns {{ isAnomaly: boolean, reason: string, zScore: string|null }}
 */
function detectAnomaly(kpiResult) {
  // Sparse history or no data → cannot evaluate, not an anomaly yet
  if (kpiResult.sparseHistory || !kpiResult.dataAvailable) {
    return { isAnomaly: false, reason: 'Sparse history or no data available', zScore: null };
  }

  // No prior period to compare against
  if (kpiResult.pctChange === null || kpiResult.pctChange === undefined) {
    return { isAnomaly: false, reason: 'No prior period for comparison', zScore: null };
  }

  const { pctChange, alertThreshold, value, priorValue } = kpiResult;
  let isAnomaly = false;
  const reasons = [];

  if (alertThreshold) {
    // Rule 1: Percentage change exceeds threshold defined in KPI contract
    if (alertThreshold.pct_change && Math.abs(pctChange) >= alertThreshold.pct_change) {
      isAnomaly = true;
      reasons.push(`% change (${pctChange.toFixed(1)}%) exceeds alert threshold (±${alertThreshold.pct_change}%)`);
    }

    // Rule 2: Absolute percentage-point change (for ratio KPIs like gross_margin %)
    if (alertThreshold.pct_point_change && Math.abs(value - priorValue) >= alertThreshold.pct_point_change) {
      isAnomaly = true;
      reasons.push(`Absolute change (${(value - priorValue).toFixed(2)}pp) exceeds threshold (±${alertThreshold.pct_point_change}pp)`);
    }

    // Rule 3: Business impact in USD (absolute difference, only for USD-denominated KPIs)
    if (alertThreshold.business_impact_usd && Math.abs(value - priorValue) >= alertThreshold.business_impact_usd) {
      isAnomaly = true;
      reasons.push(`Business impact ($${Math.abs(value - priorValue).toLocaleString()}) exceeds threshold ($${alertThreshold.business_impact_usd.toLocaleString()})`);
    }
  }

  // Rule 4: Statistical significance — simulated Z-score from pctChange magnitude
  // In production this would use rolling mean/std dev across N historical periods.
  const zScore = pctChange / 10;
  if (Math.abs(zScore) > 2.5) {
    isAnomaly = true;
    reasons.push(`Statistically significant movement (|Z-score| = ${Math.abs(zScore).toFixed(2)} > 2.5)`);
  }

  return {
    isAnomaly,
    reason: reasons.length > 0 ? reasons.join('; ') : 'No anomaly detected',
    zScore: zScore.toFixed(2),
    method: 'Z-score (simulated) + business rule thresholds from KPI contract',
  };
}

module.exports = { detectAnomaly };
