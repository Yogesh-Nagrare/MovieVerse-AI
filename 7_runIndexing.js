// =====================================================================
// 7_runIndexing.js — RUNS THE COMPLETE INDEXING PIPELINE
// =====================================================================
//
// Command: npm run index
//
// ── SMART SKIPPING ───────────────────────────────────────────────────
//
//  Step 1 (Extraction) → skips batches already in checkpoint.json
//  Step 2 (Neo4j)      → skips entirely if movie count already matches
//  Step 3 (Embeddings) → skips chunks already in embed_checkpoint.json
//
//  To force a full fresh run → delete both checkpoint files:
//    ./data/checkpoint.json
//    ./data/embed_checkpoint.json
//
// ── ARCHITECTURE ─────────────────────────────────────────────────────
//
//  Step 1 → gemini-2.5-flash-lite (1000 RPD free)
//  Step 2 → Neo4j (unchanged)
//  Step 3 → @huggingface/transformers local model (zero API calls)
//
// =====================================================================

import { extractAllEntities } from "./4_entityExtractor.js";
import { buildGraph } from "./5_graphBuilder.js";
import { buildVectorStore } from "./6_vectorStore.js";
import { driver, closeConnections } from "./2_config.js";

const pdfPath = './data/movies.pdf';

async function isGraphAlreadyBuilt(expectedCount) {
  const session = driver.session();
  try {
    const result = await session.run("MATCH (m:Movie) RETURN count(m) AS count");
    const count = result.records[0].get("count").toNumber();
    return { count, alreadyBuilt: count >= expectedCount };
  } finally {
    await session.close();
  }
}

async function runIndexing(pdfPath) {
  console.log("===========================================");
  console.log("   🎬 GraphRAG Indexing Pipeline");
  console.log("   📋 Embeddings: LOCAL (zero API calls)");
  console.log("   📋 Extraction: gemini-2.5-flash-lite");
  console.log("===========================================\n");

  const startTime = Date.now();

  try {
    // ── STEP 1: Extract Entities ──
    console.log("── STEP 1: Extracting Entities (Gemini flash-lite) ──");
    const entities = await extractAllEntities(pdfPath);

    if (entities.length === 0) {
      console.error("\n❌ No entities extracted. Check your PDF path and GEMINI_API_KEY.");
      await closeConnections();
      return;
    }

    // ── STEP 2: Build Neo4j Graph (skip if already built) ──
    // ── STEP 2: Build Neo4j Graph (skip if already built) ──
    console.log("\n── STEP 2: Building Graph (Neo4j) ──");
    const { count } = await isGraphAlreadyBuilt(1000);
    if (count >= 980) {
      console.log(`   ✅ Graph already has ${count} movies. Skipping.`);
    } else {
      console.log(`   ℹ️  Neo4j empty. Building graph...`);
      await buildGraph(entities);
    }

    // ── STEP 3: Build Vector Store ──
    console.log("\n── STEP 3: Building Vector Store (local embeddings → Pinecone) ──");
    await buildVectorStore(pdfPath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n===========================================");
    console.log(`   ✅ Indexing complete in ${elapsed}s`);
    console.log("===========================================");

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ Indexing failed after ${elapsed}s:`, err.message);
    console.error(err.stack);
    console.log("\n💡 Re-run to resume from checkpoint. No work is lost.");
  } finally {
    await closeConnections();
  }
}

runIndexing(pdfPath);