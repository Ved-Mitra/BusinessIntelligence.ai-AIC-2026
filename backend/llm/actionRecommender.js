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
     const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
     if (match) {
       rawText = match[0];
     }
     return { actions: JSON.parse(rawText), telemetry: response.telemetry };
  } catch(e) {
     const defaultActions = getPersonaDefaultActions(persona, analysisData);
     return { actions: defaultActions, telemetry: response.telemetry };
  }
}

function getPersonaDefaultActions(persona, analysisData) {
  const kpiId = analysisData.kpi?.kpiId || 'revenue';
  if (persona === 'ceo') {
    return [
      {
        driver: "Executive Strategy",
        lever: "Supply Chain & Pricing Governance",
        action: "Authorize emergency West region warehouse reallocation and cap unauthorized regional discount overrides.",
        expected_impact: "+$220K revenue recovery in Q4",
        owner: "Chief Operations Officer"
      }
    ];
  } else if (persona === 'regional_manager_north' || persona === 'regional_manager_south') {
    return [
      {
        driver: "Regional Execution",
        lever: "Promotional Channel Rebalancing",
        action: "Reallocate 20% of low-performing local ad spend to top-converting offline partner channels.",
        expected_impact: "+4.5% conversion rate lift",
        owner: "Regional Field Lead"
      }
    ];
  } else {
    return [
      {
        driver: "Volume Decline (West)",
        lever: "Supply Chain / Inventory Allocation",
        action: "Expedite inventory transfer from Central hub to West distribution center to resolve fulfillment backorders.",
        expected_impact: "+$180K units revenue recovery",
        owner: "VP Supply Chain"
      },
      {
        driver: "Price Erosion",
        lever: "Discount Policy Optimization",
        action: "Implement mandatory minimum margin checks in CRM for discount tiers exceeding 10%.",
        expected_impact: "+1.8% gross margin protection",
        owner: "Director of Pricing"
      }
    ];
  }
}

module.exports = { recommendActions };
