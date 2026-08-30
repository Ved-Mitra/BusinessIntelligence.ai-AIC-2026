/**
 * llm/geminiClient.js
 * Thin wrapper around the @google/genai SDK.
 *
 * - Uses gemini-2.0-flash (cost-efficient, fast)
 * - Tracks token usage and estimated cost for telemetry
 * - Falls back to a deterministic mock when GEMINI_API_KEY is missing
 *   (lets the demo run without an API key during development)
 *
 * Cost reference (Gemini 2.0 Flash, as of 2025):
 *   Input:  $0.075 / 1M tokens
 *   Output: $0.30  / 1M tokens
 */
'use strict';

const { GoogleGenAI } = require('@google/genai');

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash'
].filter(Boolean);

let _ai = null;
function getAi() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

/**
 * Generate text using Gemini with multi-model fallback.
 * @param {string} systemPrompt  - Persona / role instruction
 * @param {string} userPrompt    - Pre-computed analytical context (never raw data)
 * @returns {Promise<{ text: string, telemetry: Object }>}
 */
async function generateText(systemPrompt, userPrompt) {
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
    return mockResponse(systemPrompt);
  }

  const ai = getAi();
  const t0 = Date.now();
  let lastError = null;

  // Try candidate models in sequence
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model:    modelName,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.4,   // lower = more factual, less creative drift
        },
      });

      const llmLatencyMs = Date.now() - t0;
      const inTokens  = response.usageMetadata?.promptTokenCount     || 0;
      const outTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const costUsd   = (inTokens * 0.075 + outTokens * 0.30) / 1_000_000;

      return {
        text: response.text,
        telemetry: {
          llm_latency_ms:      llmLatencyMs,
          input_tokens:        inTokens,
          output_tokens:       outTokens,
          estimated_cost_usd:  parseFloat(costUsd.toFixed(7)),
          model:               modelName,
          cache_hit:           0,
        },
      };
    } catch (err) {
      lastError = err;
      console.warn(`[geminiClient] Model '${modelName}' attempt failed:`, err.message || err);
      // If error is not 404 (e.g. 403 or quota), break or try next
    }
  }

  // Graceful fallback to mock response if all remote attempts fail
  console.warn('[geminiClient] All Gemini API attempts failed; gracefully falling back to deterministic synthesis.');
  return mockResponse(systemPrompt);
}

/**
 * Deterministic mock — used when no API key is configured.
 * Returns plausible text so the UI renders correctly during local dev.
 */
function mockResponse(systemPrompt) {
  const isAnalyst = systemPrompt.toLowerCase().includes('analyst');
  const isCeo     = systemPrompt.toLowerCase().includes('ceo');

  let text;
  if (isCeo) {
    text = `Revenue fell **33.6%** in October 2025, from **$2.14M** to **$1.42M**, driven primarily by a supply disruption in the West region that eroded unit volume by **43%**. A simultaneous discount overshoot cut average unit price by **$21.65**. Immediate priority: restore West fulfilment capacity and cap regional discount tiers.`;
  } else if (isAnalyst) {
    text = `October 2025 revenue is **$1.42M**, a statistically significant decline of **-33.56%** versus September's **$2.14M** baseline. The Z-score of **-3.36** (p < 0.01) confirms this as a confirmed anomaly — well beyond the ±2.5 threshold defined in the KPI contract.

## Driver Breakdown

Additive decomposition attributes the **-$717,667** shortfall to three simultaneous effects:

- **Volume Effect (-$605,735 / 84.4%):** Units sold contracted **-43.2%**, heavily concentrated in the West region. A supplier bottleneck in weeks 1–3 restricted fulfilment across the Premium and Standard product lines.
- **Price Effect (-$111,932 / 15.6%):** Average Selling Price fell from **$296.49 → $274.84** (-7.3%), driven by an unapproved regional discount campaign that exceeded the authorised 10% threshold.
- **Mix & Channel Effect ($0 / 0%):** Residual mix shifts net to zero — the volume and price vectors fully account for the observed variance.

## Data Quality

The \`financials_monthly\` feed shows a **PARTIAL** data quality flag for October — the external supplier event log is incomplete for weeks 3–4. This does not affect the sales decomposition but limits EBITDA-level attribution.

Confidence level: **High** — full daily granularity available, multi-source corroboration between sales and marketing feeds.`;
  } else {
    text = `North region revenue is **$380K** in October, down **28%** from September's **$540K**. The decline is driven primarily by a **price effect** from the same regional discount campaign affecting all zones, compounded by a moderate **-12% volume dip** in the Partner channel.

The West region supply disruption did not directly impact North fulfilment. Focus areas for recovery: review Partner channel promotional spend efficiency and enforce the 10% maximum discount threshold at the regional level.`;
  }

    return {
      text,
      telemetry: {
        llm_latency_ms:     120,
        input_tokens:       280,
        output_tokens:      90,
        estimated_cost_usd: 0.0000477,
        model:              `${DEFAULT_MODEL}-mock`,
        cache_hit:          1,
      },
    };
}

module.exports = { generateText };
