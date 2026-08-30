/**
 * routes/feedbackRoutes.js
 * POST /api/feedback   — Store analyst rating and optional correction
 * GET  /api/feedback   — Get all feedback (analyst access only)
 */
'use strict';

const express  = require('express');
const router   = express.Router();
const path     = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.sqlite');
function getDb() { return new Database(DB_PATH); }

router.post('/', (req, res) => {
  const { narrative_id, kpi_id, persona, rating, correction_text = '' } = req.body;
  if (!narrative_id || !kpi_id || !persona || !rating) {
    return res.status(400).json({ error: 'narrative_id, kpi_id, persona, and rating are required.' });
  }
  if (!['thumbs_up', 'thumbs_down'].includes(rating)) {
    return res.status(400).json({ error: 'rating must be thumbs_up or thumbs_down.' });
  }
  const db = getDb();
  db.prepare(`INSERT INTO feedback (narrative_id, kpi_id, persona, rating, correction_text) VALUES (?,?,?,?,?)`)
    .run(narrative_id, kpi_id, persona, rating, correction_text);
  db.close();
  res.json({ success: true, message: 'Feedback recorded.' });
});

router.get('/', (req, res) => {
  const persona = req.headers['x-persona'] || 'analyst';
  if (persona !== 'analyst') {
    return res.status(403).json({ error: 'Feedback history requires analyst role.' });
  }
  const db = getDb();
  const rows = db.prepare('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 100').all();
  db.close();
  res.json({ feedback: rows });
});

module.exports = router;
