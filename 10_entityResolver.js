// =====================================================================
// 9_entityResolver.js — EXTRACT + RESOLVE ENTITIES
// =====================================================================

import { genai, driver } from "./2_config.js";

const MODEL = "gemini-2.5-flash-lite";

const NODE_TYPES = [
  { label: "Movie", property: "title" },
  { label: "Director", property: "name" },
  { label: "Actor", property: "name" },
  { label: "Genre", property: "name" },
  { label: "Theme", property: "name" },
  { label: "Award", property: "name" },
];

// ── Helper: call Gemini with proper error handling ──
async function callGemini(prompt) {
  try {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return response.text.trim();
  } catch (err) {
    const is429 = err.message?.includes("429") || err.status === 429;
    if (is429) {
      console.warn("   ⚠️  Gemini quota exceeded. Waiting 65s...");
      await new Promise(r => setTimeout(r, 65000));
      // Retry once
      const response = await genai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      return response.text.trim();
    }
    throw err;
  }
}

// =====================================================================
// Step 1: LLM extracts entity names from query
// =====================================================================
async function extractEntities(query) {
  const prompt = `You extract entity names from movie-related queries.

Extract ALL names, titles, and specific terms from the query.
Do NOT extract generic words like "movies", "recommend", "find", "show".
Do NOT extract adjectives like "good", "best", "latest".
DO extract: person names, movie titles, genre names, theme names, award names.

Respond ONLY with a JSON array of strings. No markdown, no backticks.

Examples:
"Movies directed by Christopher Nolan" → ["Christopher Nolan"]
"Action movies with Tom Hardy" → ["Action", "Tom Hardy"]
"How is DiCaprio related to Nolan?" → ["DiCaprio", "Nolan"]
"Tell me about Inception" → ["Inception"]
"Movies like Inception" → ["Inception"]
"Sci-fi movies that won Oscar" → ["Sci-fi", "Oscar"]
"Recommend me a good thriller" → ["thriller"]
"Movies about dreams and reality" → ["dreams", "reality"]
"who directed Movie 0001" → ["Movie 0001"]
"how is Zendaya related to James Cameron" → ["Zendaya", "James Cameron"]

Query: ${query}`;

  try {
    const raw = (await callGemini(prompt))
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(raw);
  } catch (err) {
    console.warn("⚠️ Entity extraction failed:", err.message?.substring(0, 80));
    return [];
  }
}

// =====================================================================
// Step 2: Resolve ONE entity across ALL node types in Neo4j
// =====================================================================
async function resolveEntity(entityName) {
  const session = driver.session({ defaultAccessMode: "READ" });
  const matches = [];

  try {
    for (const { label, property } of NODE_TYPES) {
      const exactResult = await session.run(
        `MATCH (n:${label})
         WHERE toLower(n.${property}) = toLower($name)
         RETURN n.${property} AS nodeName, labels(n)[0] AS label
         LIMIT 5`,
        { name: entityName }
      );

      if (exactResult.records.length > 0) {
        for (const record of exactResult.records) {
          matches.push({
            searchTerm: entityName,
            label: record.get("label"),
            nodeName: record.get("nodeName"),
            matchType: "exact",
          });
        }
        continue;
      }

      const partialResult = await session.run(
        `MATCH (n:${label})
         WHERE toLower(n.${property}) CONTAINS toLower($name)
         RETURN n.${property} AS nodeName, labels(n)[0] AS label
         LIMIT 5`,
        { name: entityName }
      );

      for (const record of partialResult.records) {
        matches.push({
          searchTerm: entityName,
          label: record.get("label"),
          nodeName: record.get("nodeName"),
          matchType: "partial",
        });
      }
    }
  } finally {
    await session.close();
  }

  const exactMatches = matches.filter((m) => m.matchType === "exact");
  if (exactMatches.length > 0) return exactMatches;
  return matches;
}

// =====================================================================
// Main: Extract entities from query → Resolve each in Neo4j
// =====================================================================
async function resolveQueryEntities(query) {
  console.log("   🔍 Step 1: Extracting entities from query...");
  const entityNames = await extractEntities(query);
  console.log(`   ✅ Found: [${entityNames.join(", ")}]`);

  if (entityNames.length === 0) {
    return { query, entities: [], unresolved: [] };
  }

  console.log("   🗄️  Step 2: Resolving entities in Neo4j...");
  const resolved = [];
  const unresolved = [];

  for (const name of entityNames) {
    const matches = await resolveEntity(name);
    if (matches.length > 0) {
      for (const match of matches) {
        resolved.push(match);
        console.log(`   ✅ "${name}" → ${match.label} (${match.nodeName}) [${match.matchType}]`);
      }
    } else {
      unresolved.push(name);
      console.log(`   ❌ "${name}" → not found in graph`);
    }
  }

  return { query, entities: resolved, unresolved };
}

export { resolveQueryEntities, resolveEntity };