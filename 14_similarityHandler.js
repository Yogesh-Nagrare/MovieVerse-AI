// =====================================================================
// 12_similarityHandler.js — Similarity: local embed → Pinecone → Neo4j → Gemini
// =====================================================================
// Embeddings: local (9_localEmbedding.js) — zero API calls
// Final answer: Gemini via genai (not llm)
// =====================================================================

import { pineconeIndex, driver, genai } from "./2_config.js";
import { localEmbed } from "./9_localEmbedding.js";

const MODEL = "gemini-2.5-flash-lite";
const SIMILARITY_TOP_K = 5;

async function handleSimilarityQuery(query, resolved) {
  // Step 1: Embed query locally
  console.log("   🧠 Embedding query (local)...");
  const queryVector = await localEmbed(query);

  // Step 2: Search Pinecone
  console.log("   🔍 Searching Pinecone...");
  const searchResults = await pineconeIndex.query({
    vector: queryVector,
    topK: SIMILARITY_TOP_K,
    includeMetadata: true,
  });

  if (!searchResults.matches || searchResults.matches.length === 0) {
    return "I couldn't find any movies matching your query in the vector store.";
  }

  // Step 3: Extract text chunks
  const retrievedChunks = searchResults.matches
    .map((m) => m.metadata?.text || "")
    .filter(Boolean);

  console.log(`   ✅ Retrieved ${retrievedChunks.length} chunks from Pinecone`);

  // Step 4: Enrich with Neo4j graph data
  const movieTitles = extractMovieTitles(retrievedChunks);
  let graphContext = "";

  if (movieTitles.length > 0) {
    console.log(`   🗄️  Fetching graph context for ${movieTitles.length} movies...`);
    graphContext = await fetchGraphContext(movieTitles);
  }

  // Step 5: Gemini generates final answer
  console.log("   🤖 Generating answer with Gemini...");
  const prompt = buildPrompt(query, retrievedChunks.join("\n\n---\n\n"), graphContext, resolved);

  const response = await genai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response.text;
}

// ── Extract movie titles from chunk text ──
function extractMovieTitles(chunks) {
  const titles = new Set();
  for (const chunk of chunks) {
    const titleMatch = chunk.match(/Movie Title:\s*(.+)/);
    if (titleMatch) titles.add(titleMatch[1].trim());
  }
  return Array.from(titles);
}

// ── Fetch graph context from Neo4j ──
async function fetchGraphContext(movieTitles) {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (m:Movie)
       WHERE m.title IN $titles
       OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
       OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
       OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
       RETURN m.title AS title,
              m.year AS year,
              d.name AS director,
              collect(DISTINCT a.name)[0..5] AS actors,
              collect(DISTINCT g.name) AS genres`,
      { titles: movieTitles }
    );

    return result.records
      .map((r) => {
        const t = r.get("title");
        const y = r.get("year");
        const d = r.get("director") || "Unknown";
        const a = r.get("actors").join(", ") || "Unknown";
        const g = r.get("genres").join(", ") || "Unknown";
        return `${t} (${y}) | Director: ${d} | Actors: ${a} | Genres: ${g}`;
      })
      .join("\n");
  } finally {
    await session.close();
  }
}

// ── Build Gemini prompt ──
function buildPrompt(query, vectorContext, graphContext, resolved) {
  const entityInfo = resolved?.entities?.map(e => `${e.nodeName} (${e.label})`).join(", ") || "";

  return `You are a movie expert assistant. Answer the user's question using ONLY the provided context.

USER QUESTION: ${query}
${entityInfo ? `\nRESOLVED ENTITIES: ${entityInfo}` : ""}

SIMILAR MOVIES FROM VECTOR SEARCH:
${vectorContext}

${graphContext ? `GRAPH DATA FOR THOSE MOVIES:\n${graphContext}` : ""}

Instructions:
- Answer conversationally and helpfully
- Reference specific movies from the context
- If the context doesn't have enough info, say so honestly
- Do not make up movies or facts not in the context`;
}

export { handleSimilarityQuery };