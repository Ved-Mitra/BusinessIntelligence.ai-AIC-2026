/**
 * server.js — BusinessIntelligence.ai Backend
 * KPI Intelligence-to-Action Engine
 *
 * Starts an Express API server.
 * All KPI numbers are computed via deterministic SQL — the LLM is NEVER
 * used as a source of quantitative truth.
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const kpiRoutes       = require('./routes/kpiRoutes');
const analysisRoutes  = require('./routes/analysisRoutes');
const feedbackRoutes  = require('./routes/feedbackRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} [persona: ${req.headers['x-persona'] || '-'}] → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BusinessIntelligence.ai API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/kpis',      kpiRoutes);
app.use('/api/analysis',  analysisRoutes);
app.use('/api/feedback',  feedbackRoutes);
app.use('/api/telemetry', telemetryRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.statusCode || 500).json({ error: err.message });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n BusinessIntelligence.ai API`);
  console.log(` Listening on http://localhost:${PORT}`);
  console.log(` Health: http://localhost:${PORT}/health`);
  console.log(` KPIs:   http://localhost:${PORT}/api/kpis\n`);
});

module.exports = app;
