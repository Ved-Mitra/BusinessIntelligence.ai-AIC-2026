/**
 * routes/telemetryRoutes.js
 * GET /api/telemetry        — Recent telemetry records
 * GET /api/telemetry/stats  — Aggregate stats (total cost, avg latency)
 */
'use strict';

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.sqlite');
function getDb() { return new Database(DB_PATH, { readonly: true }); }

router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit || 20);
  const db    = getDb();
  const rows  = db.prepare('SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ?').all(limit);
  db.close();
  res.json({ telemetry: rows });
});

router.get('/stats', (req, res) => {
  const db   = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*)                         AS total_requests,
      SUM(estimated_cost_usd)          AS total_cost_usd,
      AVG(total_latency_ms)            AS avg_latency_ms,
      AVG(llm_latency_ms)              AS avg_llm_latency_ms,
      SUM(input_tokens + output_tokens) AS total_tokens,
      SUM(llm_calls)                   AS total_llm_calls
    FROM telemetry
  `).get();
  db.close();
  res.json({ stats });
});

module.exports = router;
