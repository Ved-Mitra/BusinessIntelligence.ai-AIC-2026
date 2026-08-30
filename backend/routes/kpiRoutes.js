/**
 * routes/kpiRoutes.js
 * GET /api/kpis           — All KPIs for a persona + period
 * GET /api/kpis/:kpiId    — Single KPI detail
 * GET /api/sources        — Source freshness metadata
 * GET /api/personas       — List available personas
 */

'use strict';

const express       = require('express');
const router        = express.Router();
const { calculateAllKpis, calculateKpi, getSourceFreshness } = require('../kpi/kpiEngine');
const { getEntitlements, getPersonas } = require('../security/entitlements');

// ── GET /api/personas ────────────────────────────────────────────────────────
router.get('/personas', (req, res) => {
  res.json({ personas: getPersonas() });
});

// ── GET /api/sources ─────────────────────────────────────────────────────────
router.get('/sources', (req, res) => {
  res.json({ sources: getSourceFreshness() });
});

// ── GET /api/kpis ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const persona = req.headers['x-persona'] || 'analyst';
  const year    = parseInt(req.query.year  || 2025);
  const month   = parseInt(req.query.month || 10);   // default to Month 10 (the drop)

  let entitlements;
  try {
    entitlements = getEntitlements(persona);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ error: err.message });
  }

  const kpis = calculateAllKpis(persona, year, month, entitlements);
  res.json({ persona, period: { year, month }, kpis, entitlements: { regionFilter: entitlements.regionFilter, allowedKpis: entitlements.allowedKpis } });
});

// ── GET /api/kpis/:kpiId ──────────────────────────────────────────────────────
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
    const result = calculateKpi(kpiId, year, month, filters);
    res.json({ persona, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
