// =====================================================================
// 9_entityResolver.js — EXTRACT + RESOLVE ENTITIES
// =====================================================================
// UPDATED: accepts apiKey param, uses getGenai() for dynamic key
// =====================================================================

import { getGenai, driver } from "./2_config.js";

const MODEL = "gemini-2.5-flash-lite";

const NODE_TYPES = [
  { label: "Movie", property: "title" },
  { label: "Director", property: "name" },
  { label: "Actor", property: "name" },
  { label: "Genre", property: "name" },
  { label: "Theme", property: "name" },
  { label: "Award", property: "name" },
];

async function callGemini(prompt, apiKey) {
  const g = getGenai(apiKey);
  try {
    const response = await g.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return response.text.trim();
  } catch (err) {
    const is429 = err.message?.includes("429") || err.status === 429;
    if (is429) {
      console.warn("   ⚠️  Quota hit. Waiting 65s...");
      await new Promise(r => setTimeout(r, 65000));
      const response = await g.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      return response.text.trim();
    }
    throw err;
  }
}

async function extractEntities(query, apiKey) {
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
"Tell me about Movie 0315" → ["Movie 0315"]
"Movies like Inception" → ["Inception"]
"who directed Movie 0001" → ["Movie 0001"]
"how is Zendaya related to James Cameron" → ["Zendaya", "James Cameron"]

Query: ${query}`;

  try {
    const raw = (await callGemini(prompt, apiKey))
      .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(raw);
  } catch (err) {
    console.warn("⚠️ Entity extraction failed:", err.message?.substring(0, 80));
    return [];
  }
}

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

  const exactMatches = matches.filter(m => m.matchType === "exact");
  return exactMatches.length > 0 ? exactMatches : matches;
}

async function resolveQueryEntities(query, apiKey = null) {
  console.log("   🔍 Step 1: Extracting entities from query...");
  const entityNames = await extractEntities(query, apiKey);
  console.log(`   ✅ Found: [${entityNames.join(", ")}]`);

  if (entityNames.length === 0) return { query, entities: [], unresolved: [] };

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
      console.log(`   ❌ "${name}" → not found`);
    }
  }

  return { query, entities: resolved, unresolved };
}

export { resolveQueryEntities, resolveEntity };