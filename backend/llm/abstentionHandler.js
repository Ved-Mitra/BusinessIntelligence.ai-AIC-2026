/**
 * llm/abstentionHandler.js
 * Checks if the engine should abstain from explanation based on confidence.
 */
'use strict';

/**
 * Checks if we should abstain.
 * @param {Object} confidence
 * @returns {Object|null} Abstention response, or null if ok.
 */
function checkAbstention(confidence) {
  if (confidence.score < 0.40) {
     return {
       isAbstaining: true,
       message: `Insufficient data to attribute this movement with confidence. ${confidence.reason}. Recommend revisiting later.`
     };
  }
  return null;
}

module.exports = { checkAbstention };
