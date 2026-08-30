/**
 * llm/narrativeGenerator.js
 * Uses LLM to synthesize natural language from analytical results.
 */
'use strict';

const { generateText } = require('./geminiClient');

const PERSONA_PROMPTS = {
  ceo: "You are briefing the CEO. Keep it high-level, strategic, minimal jargon, focus on bottom-line impact. Use 3-4 sentences max.",
  analyst: "You are briefing a BI Analyst. Provide a full driver breakdown, statistical details, data quality caveats, and lineage. Be precise and analytical.",
  regional_manager_north: "You are briefing the North Region Manager. Only reference North region data. Compare to peer benchmarks implicitly if relevant. Focus on local levers.",
  regional_manager_south: "You are briefing the South Region Manager. Only reference South region data. Focus on local levers."
};

async function generateNarrative(persona, analysisData) {
  const systemPrompt = PERSONA_PROMPTS[persona] || "You are a helpful business assistant.";
  const userPrompt = `Based on the following analytical data, explain what happened to the KPI:
  KPI: ${analysisData.kpi.name}
  Change: ${analysisData.kpi.pctChange}%
  Anomaly Detected: ${analysisData.analysis.anomaly.isAnomaly} (${analysisData.analysis.anomaly.reason})
  Drivers: ${JSON.stringify(analysisData.analysis.drivers)}
  Confidence: ${analysisData.analysis.confidence.label} (${analysisData.analysis.confidence.reason})`;

  const response = await generateText(systemPrompt, userPrompt);
  return response;
}

module.exports = { generateNarrative };
