/**
 * llm/actionRecommender.js
 * Generates structured actions using the LLM.
 */
'use strict';

const { generateText } = require('./geminiClient');

async function recommendActions(persona, analysisData) {
  const systemPrompt = "You are a business strategist recommending actions. Provide 1-2 practical recommended actions structured as JSON array of objects with keys: driver, lever, action, expected_impact, owner. Do not use markdown blocks in the output, just raw JSON.";
  const userPrompt = `Drivers: ${JSON.stringify(analysisData.analysis.drivers)}. Generate actions tailored for persona: ${persona}`;

  const response = await generateText(systemPrompt, userPrompt);
  try {
     let rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
     return { actions: JSON.parse(rawText), telemetry: response.telemetry };
  } catch(e) {
     return { actions: [{ action: "Review dashboard manually due to parsing error." }], telemetry: response.telemetry };
  }
}

module.exports = { recommendActions };
