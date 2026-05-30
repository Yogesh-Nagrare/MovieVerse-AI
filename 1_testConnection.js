// =====================================================================
// 1_testConnection.js — RUN THIS FIRST
// =====================================================================
// Command: node 1_testConnection.js
//
// Tests all 4 services. If any fails, fix your .env file.
// =====================================================================

import { driver, pineconeIndex, genai, closeConnections } from "./2_config.js";
import { localEmbed } from "./9_localEmbedding.js";

async function testConnections() {
  console.log("🔍 Testing all connections...\n");

  // ── Test 1: Neo4j ──
  try {
    const session = driver.session();
    const result = await session.run("RETURN 'Neo4j Connected!' AS message");
    console.log("✅ Neo4j:", result.records[0].get("message"));
    await session.close();
  } catch (err) {
    console.error("❌ Neo4j:", err.message);
  }

  // ── Test 2: Pinecone ──
  try {
    const stats = await pineconeIndex.describeIndexStats();
    console.log(`✅ Pinecone: Connected | Vectors: ${stats.totalRecordCount || 0} | Dims: ${stats.dimension}`);
    if (stats.dimension !== 384) {
      console.warn(`   ⚠️  Expected 384 dims, got ${stats.dimension}. Recreate your Pinecone index at 384 dims.`);
    }
  } catch (err) {
    console.error("❌ Pinecone:", err.message);
  }

  // ── Test 3: Gemini (LLM only — no embeddings) ──
  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: "Say 'Gemini Connected!' and nothing else." }] }],
    });
    console.log("✅ Gemini:", response.text.trim());
  } catch (err) {
    console.error("❌ Gemini:", err.message);
  }

  // ── Test 4: Local Embeddings ──
  try {
    const vector = await localEmbed("test movie recommendation");
    console.log(`✅ Local Embeddings (all-MiniLM-L6-v2): Dims = ${vector.length}`);
    if (vector.length !== 384) {
      console.warn(`   ⚠️  Expected 384 dims, got ${vector.length}`);
    }
  } catch (err) {
    console.error("❌ Local Embeddings:", err.message);
  }

  await closeConnections();
}

testConnections();