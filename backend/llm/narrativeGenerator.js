/**
 * llm/narrativeGenerator.js
 * Uses LLM to synthesize natural language from analytical results.
 */
'use strict';

const { generateText } = require('./geminiClient');

const FORMAT_RULES = `
Output rules (STRICT — follow exactly):
- Use ONLY: plain prose paragraphs, ## headings, **bold**, *italic*, bullet lists (- item), numbered lists.
- Do NOT use: ASCII art, pipe tables (|col|col|), waterfall diagrams, code blocks, horizontal rules as separators, or any table syntax.
- Do NOT include a section titled "Executive Summary" — just write the analysis directly.
- Keep sentences clear and concise. Use numbers and percentages inline in prose, not in tables.
- For the analyst persona: write 3–5 focused paragraphs covering anomaly, drivers, confidence, and data quality. Do NOT exceed 250 words.
- For the CEO persona: write 2–3 sentences only. Total brevity.
- For regional manager personas: write 2–3 short paragraphs focused on their region only.`;

const PERSONA_PROMPTS = {
  ceo:
    `You are briefing the CEO. 2-3 sentences maximum. Focus only on bottom-line revenue impact, the single biggest driver, and one clear action. No jargon. No markdown beyond **bold** for key numbers.${FORMAT_RULES}`,

  analyst:
    `You are briefing a BI Analyst. Write 3–5 paragraphs covering: (1) statistical significance of the movement, (2) the ranked drivers and their exact dollar/percentage contributions, (3) any data quality caveats, (4) confidence level and its reason. Use **bold** for key numbers. Use bullet lists for drivers only.${FORMAT_RULES}`,

  regional_manager_north:
    `You are briefing the North Region Manager. Reference ONLY North region data. 2–3 paragraphs covering regional volume/price movement and local operational levers. Do NOT mention other regions or corporate-wide figures.${FORMAT_RULES}`,

  regional_manager_south:
    `You are briefing the South Region Manager. Reference ONLY South region data. 2–3 paragraphs covering regional volume/price movement and local operational levers. Do NOT mention other regions or corporate-wide figures.${FORMAT_RULES}`
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
