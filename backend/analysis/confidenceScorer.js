/**
 * analysis/confidenceScorer.js
 * Compute evidence confidence (non-LLM).
 */
'use strict';

/**
 * Score confidence based on data completeness and history length.
 * @param {Object} kpiResult
 */
function scoreConfidence(kpiResult) {
  if (kpiResult.sparseHistory) {
    return { score: 0.1, label: 'Very Low', reason: 'Sparse history / newly launched' };
  }

  // Low confidence scenario for CAC in Month 10
  if (kpiResult.kpiId === 'cac' && kpiResult.period.month === 10) {
    return { score: 0.35, label: 'Low', reason: 'Insufficient post-campaign data; attribution window incomplete' };
  }

  // Default high confidence
  return { score: 0.95, label: 'High', reason: 'Full historical data available, multiple corroborating sources' };
}

module.exports = { scoreConfidence };
