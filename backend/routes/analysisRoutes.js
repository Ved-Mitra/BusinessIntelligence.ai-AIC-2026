/**
 * routes/analysisRoutes.js
 * GET /api/analysis/:kpiId
 */
'use strict';

const express = require('express');
const router = express.Router();
const { calculateKpi } = require('../kpi/kpiEngine');
const { getEntitlements } = require('../security/entitlements');
const { detectAnomaly } = require('../analysis/anomalyDetector');
const { analyzeDrivers } = require('../analysis/contributionAnalysis');
const { rankDrivers } = require('../analysis/driverRanker');
const { scoreConfidence } = require('../analysis/confidenceScorer');

router.get('/:kpiId', (req, res) => {
  const { kpiId }  = req.params;
  const persona    = req.headers['x-persona'] || 'analyst';
  const year       = parseInt(req.query.year  || 2025);
  const month      = parseInt(req.query.month || 10);

  let entitlements;
  try {
    entitlements = getEntitlements(persona);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  if (!entitlements.allowedKpis.includes(kpiId)) {
    return res.status(403).json({ error: `Persona '${persona}' does not have access to KPI '${kpiId}'.` });
  }

  const filters = entitlements.regionFilter ? { region: entitlements.regionFilter } : {};

  try {
    const kpiResult = calculateKpi(kpiId, year, month, filters);
    const anomaly = detectAnomaly(kpiResult);
    const drivers = analyzeDrivers(kpiResult);
    const rankedDrivers = rankDrivers(drivers);
    const confidence = scoreConfidence(kpiResult);

    res.json({
      persona,
      kpi: kpiResult,
      analysis: {
        anomaly,
        drivers: rankedDrivers,
        confidence
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
