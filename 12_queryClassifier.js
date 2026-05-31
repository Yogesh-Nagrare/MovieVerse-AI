// =====================================================================
// 10_queryClassifier.js — CLASSIFY QUERY
// =====================================================================
// UPDATED: accepts apiKey param
// =====================================================================

import { getGenai } from "./2_config.js";

const MODEL = "gemini-2.5-flash-lite";

async function classifyQuery(query, resolvedEntities, apiKey = null) {
  const g = getGenai(apiKey);

  const entityContext = resolvedEntities.entities.length > 0
    ? resolvedEntities.entities.map(e => `"${e.searchTerm}" is a ${e.label} (full name: "${e.nodeName}")`).join("\n")
    : "No entities were found in the database.";

  const unresolvedContext = resolvedEntities.unresolved.length > 0
    ? `\nNot found in DB: ${resolvedEntities.unresolved.join(", ")}`
    : "";

  const prompt = `You are a query classifier for a movie knowledge graph.

RESOLVED ENTITIES:
${entityContext}${unresolvedContext}

CLASSIFY as ONE of:
1. "graph" — factual, specific info, relationships, counts, filtering
2. "similarity" — "similar to", "like", "recommend based on", "what else should I watch"

Respond ONLY with JSON: {"type": "graph" or "similarity", "reasoning": "one sentence"}
No markdown, no backticks.

Query: ${query}`;

  try {
    const response = await g.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = response.text.trim()
      .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(raw);
  } catch (err) {
    const is429 = err.message?.includes("429") || err.status === 429;
    if (is429) console.warn("   ⚠️  Quota hit on classifier.");
    return { type: "similarity", reasoning: "Default fallback" };
  }
}

export { classifyQuery };