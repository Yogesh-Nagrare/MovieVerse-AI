// =====================================================================
// 12_similarityHandler.js — Similarity search
// =====================================================================
// UPDATED: accepts apiKey param
// =====================================================================

import { pineconeIndex, driver, getGenai } from "./2_config.js";
import { localEmbed } from "./9_localEmbedding.js";

const MODEL = "gemini-2.5-flash-lite";
const SIMILARITY_TOP_K = 5;

async function handleSimilarityQuery(query, resolved, apiKey = null) {
  const g = getGenai(apiKey);

  console.log("   🧠 Embedding query (local)...");
  const queryVector = await localEmbed(query);

  console.log("   🔍 Searching Pinecone...");
  const searchResults = await pineconeIndex.query({
    vector: queryVector,
    topK: SIMILARITY_TOP_K,
    includeMetadata: true,
  });

  if (!searchResults.matches || searchResults.matches.length === 0) {
    return "I couldn't find any movies matching your query.";
  }

  const retrievedChunks = searchResults.matches
    .map(m => m.metadata?.text || "").filter(Boolean);

  console.log(`   ✅ Retrieved ${retrievedChunks.length} chunks`);

  const movieTitles = extractMovieTitles(retrievedChunks);
  let graphContext = "";
  if (movieTitles.length > 0) {
    graphContext = await fetchGraphContext(movieTitles);
  }

  console.log("   🤖 Generating answer with Gemini...");
  const prompt = buildPrompt(query, retrievedChunks.join("\n\n---\n\n"), graphContext, resolved);

  const response = await g.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response.text;
}

function extractMovieTitles(chunks) {
  const titles = new Set();
  for (const chunk of chunks) {
    const match = chunk.match(/Movie Title:\s*(.+)/);
    if (match) titles.add(match[1].trim());
  }
  return Array.from(titles);
}

async function fetchGraphContext(movieTitles) {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (m:Movie) WHERE m.title IN $titles
       OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
       OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
       OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
       RETURN m.title AS title, m.year AS year,
              d.name AS director,
              collect(DISTINCT a.name)[0..5] AS actors,
              collect(DISTINCT g.name) AS genres`,
      { titles: movieTitles }
    );
    return result.records.map(r =>
      `${r.get("title")} (${r.get("year")}) | Director: ${r.get("director") || "Unknown"} | Actors: ${r.get("actors").join(", ")} | Genres: ${r.get("genres").join(", ")}`
    ).join("\n");
  } finally {
    await session.close();
  }
}

function buildPrompt(query, vectorContext, graphContext, resolved) {
  const entityInfo = resolved?.entities?.map(e => `${e.nodeName} (${e.label})`).join(", ") || "";
  return `You are a movie expert assistant. Answer using ONLY the provided context.

USER QUESTION: ${query}
${entityInfo ? `\nRESOLVED ENTITIES: ${entityInfo}` : ""}

SIMILAR MOVIES FROM VECTOR SEARCH:
${vectorContext}

${graphContext ? `GRAPH DATA:\n${graphContext}` : ""}

Instructions:
- Answer conversationally and helpfully
- Reference specific movies from the context
- Do not make up movies or facts not in the context`;
}

export { handleSimilarityQuery };