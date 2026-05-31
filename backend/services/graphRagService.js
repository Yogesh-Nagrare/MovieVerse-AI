// =====================================================================
// backend/services/graphRagService.js
// =====================================================================
// UPDATED: passes apiKey through to all handlers so user's key
// is used for their Gemini calls instead of your limited free key
// =====================================================================

import { resolveQueryEntities } from "../../10_entityResolver.js";
import { classifyQuery } from "../../12_queryClassifier.js";
import { handleGraphQuery } from "../../11_graphHandler.js";
import { handleSimilarityQuery } from "../../14_similarityHandler.js";

export async function processQuery(query, apiKey = null) {
  const resolved = await resolveQueryEntities(query, apiKey);
  const classification = await classifyQuery(query, resolved, apiKey);

  let answer;
  if (classification.type === "similarity") {
    answer = await handleSimilarityQuery(query, resolved, apiKey);
  } else {
    answer = await handleGraphQuery(query, resolved, apiKey);
  }

  return { answer, classification, resolved };
}