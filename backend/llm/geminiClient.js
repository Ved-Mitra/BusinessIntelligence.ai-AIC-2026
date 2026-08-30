/**
 * llm/geminiClient.js
 * Wrapper for Gemini API.
 */
'use strict';

const { GoogleGenAI } = require('@google/genai');

let _ai = null;
function getAi() {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _ai;
}

// Track telemetry globally for simplicity in hackathon
let telemetryLog = [];

/**
 * Call Gemini to generate text based on prompt.
 */
async function generateText(systemPrompt, userPrompt, requestId) {
  if (!process.env.GEMINI_API_KEY) {
     // Mocking response for demo if key is not set
     return mockResponse(systemPrompt, userPrompt);
  }

  const ai = getAi();
  const startTime = Date.now();
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt }
    });

    const llmLatency = Date.now() - startTime;
    // Calculate cost based on usageMetadata if present (mocked here for simplicity)
    const inTokens = response.usageMetadata?.promptTokenCount || 0;
    const outTokens = response.usageMetadata?.candidatesTokenCount || 0;
    const cost = (inTokens * 0.075 / 1000000) + (outTokens * 0.30 / 1000000);

    return {
      text: response.text,
      telemetry: {
         llm_latency_ms: llmLatency,
         input_tokens: inTokens,
         output_tokens: outTokens,
         estimated_cost_usd: cost,
         model: 'gemini-2.0-flash',
         cache_hit: 0
      }
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

function mockResponse(systemPrompt, userPrompt) {
   // A simplistic mock response if API is missing
   return {
     text: "Mocked narrative. The KPI dropped due to volume and price issues.",
     telemetry: { llm_latency_ms: 150, input_tokens: 50, output_tokens: 20, estimated_cost_usd: 0, model: 'mock', cache_hit: 1 }
   };
}

module.exports = { generateText };
