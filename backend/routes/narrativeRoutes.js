/**
 * routes/narrativeRoutes.js
 * GET /api/narrative/:kpiId
 */
'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');

const { calculateKpi } = require('../kpi/kpiEngine');
const { getEntitlements } = require('../security/entitlements');
const { detectAnomaly } = require('../analysis/anomalyDetector');
const { analyzeDrivers } = require('../analysis/contributionAnalysis');
const { rankDrivers } = require('../analysis/driverRanker');
const { scoreConfidence } = require('../analysis/confidenceScorer');

const { checkAbstention } = require('../llm/abstentionHandler');
const { generateNarrative } = require('../llm/narrativeGenerator');
const { recommendActions } = require('../llm/actionRecommender');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'db.sqlite');

router.get('/:kpiId', async (req, res) => {
  const reqStart = Date.now();
  const { kpiId }  = req.params;
  const persona    = req.headers['x-persona'] || 'analyst';
  const year       = parseInt(req.query.year  || 2025);
  const month      = parseInt(req.query.month || 10);
  const requestId  = uuidv4();

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
    // 1. Analytical Engine (Non-LLM)
    const kpiResult = calculateKpi(kpiId, year, month, filters);
    const anomaly = detectAnomaly(kpiResult);
    const drivers = analyzeDrivers(kpiResult);
    const rankedDrivers = rankDrivers(drivers);
    const confidence = scoreConfidence(kpiResult);

    const analysisData = {
      kpi: kpiResult,
      analysis: { anomaly, drivers: rankedDrivers, confidence }
    };

    const nonLlmLatency = Date.now() - reqStart;

    // 2. Abstention Logic
    const abstention = checkAbstention(confidence);
    if (abstention) {
        // Log telemetry and return early
        recordTelemetry(requestId, kpiId, persona, Date.now() - reqStart, nonLlmLatency, 0, 'none', 0, 0, 0, 0);
        return res.json({
            narrative_id: requestId,
            persona,
            abstention: true,
            narrative: abstention.message,
            actions: [],
            telemetry: { total_latency_ms: Date.now() - reqStart }
        });
    }

    // 3. LLM Generation
    const narrativeResult = await generateNarrative(persona, analysisData);
    const actionsResult = await recommendActions(persona, analysisData);

    const totalLlmLatency = narrativeResult.telemetry.llm_latency_ms + actionsResult.telemetry.llm_latency_ms;
    const totalInputTokens = narrativeResult.telemetry.input_tokens + actionsResult.telemetry.input_tokens;
    const totalOutputTokens = narrativeResult.telemetry.output_tokens + actionsResult.telemetry.output_tokens;
    const totalCost = narrativeResult.telemetry.estimated_cost_usd + actionsResult.telemetry.estimated_cost_usd;
    
    const totalLatency = Date.now() - reqStart;

    recordTelemetry(requestId, kpiId, persona, totalLatency, nonLlmLatency, totalLlmLatency, 
                    narrativeResult.telemetry.model, totalInputTokens, totalOutputTokens, totalCost, 2);

    res.json({
        narrative_id: requestId,
        persona,
        abstention: false,
        narrative: narrativeResult.text,
        actions: actionsResult.actions,
        evidence: {
            method: 'LLM + SQL',
            confidence: confidence.label,
            sources: [kpiResult.primarySource]
        },
        telemetry: {
            total_latency_ms: totalLatency,
            non_llm_latency_ms: nonLlmLatency,
            llm_latency_ms: totalLlmLatency,
            model: narrativeResult.telemetry.model,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            estimated_cost_usd: totalCost
        }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function recordTelemetry(requestId, kpiId, persona, tLatency, nLatency, lLatency, model, iTokens, oTokens, cost, calls) {
   const db = new Database(DB_PATH);
   db.prepare(`INSERT INTO telemetry 
     (request_id, kpi_id, persona, total_latency_ms, non_llm_latency_ms, llm_latency_ms, model, input_tokens, output_tokens, estimated_cost_usd, llm_calls)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
     .run(requestId, kpiId, persona, tLatency, nLatency, lLatency, model, iTokens, oTokens, cost, calls);
   db.close();
}

module.exports = router;
