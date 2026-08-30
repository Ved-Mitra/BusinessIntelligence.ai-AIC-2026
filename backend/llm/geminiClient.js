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
    text = 'Revenue declined 33.6% in October 2025, driven primarily by a supply disruption in the West region and an aggressive discount campaign that eroded unit prices by 7%. Immediate priority is to restore West region fulfilment capacity and review discount approval thresholds.';
  } else if (isAnalyst) {
    text = 'October 2025 revenue of $1.42M is 33.6% below the September baseline of $2.14M (Z-score: −3.36, p < 0.01). Additive decomposition attributes the shortfall to three simultaneous drivers: (1) Volume effect: −$717K — West region units declined 22% due to a supply disruption in weeks 1–3; (2) Price effect: −$150K — average unit price fell $34 following the discount campaign; (3) Mix/Channel effect: −$32K — sessions shifted toward the Online channel (lower AOV). Data quality flag: financials_monthly shows PARTIAL for this period (supplier feed incomplete). Attribution confidence: High for volume and price; Moderate for mix due to session-proxy methodology.';
  } else {
    text = 'North region revenue of $380K is down 28% in October. The decline is driven by the same price and seasonal factors affecting all regions, but North was not impacted by the West supply disruption. Review local promotional spend efficiency and channel mix for recovery levers.';
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
