// =====================================================================
// 10_queryClassifier.js — CLASSIFY WITH RESOLVED ENTITY CONTEXT
// =====================================================================

import { genai } from "./2_config.js";

const MODEL = "gemini-2.5-flash-lite";

async function classifyQuery(query, resolvedEntities) {
  const entityContext = resolvedEntities.entities.length > 0
    ? resolvedEntities.entities
        .map((e) => `"${e.searchTerm}" is a ${e.label} (full name: "${e.nodeName}")`)
        .join("\n")
    : "No entities were found in the database.";

  const unresolvedContext = resolvedEntities.unresolved.length > 0
    ? `\nThese terms were NOT found in the database: ${resolvedEntities.unresolved.join(", ")}`
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
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const raw = response.text.trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(raw);
  } catch (err) {
    const is429 = err.message?.includes("429") || err.status === 429;
    if (is429) console.warn("   ⚠️  Gemini quota hit on classifier. Defaulting to graph.");
    else console.warn("⚠️ Classification failed, defaulting to graph");
    return { type: "graph", reasoning: "Default fallback" };
  }
}

export { classifyQuery };