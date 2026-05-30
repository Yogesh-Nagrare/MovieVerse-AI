// =====================================================================
// 2_config.js — ALL CONNECTIONS IN ONE PLACE
// =====================================================================
//
// Connections:
//   1. Neo4j     → Graph Database
//   2. Pinecone  → Vector Database (384 dims — local embeddings)
//   3. Gemini    → LLM for entity extraction + final answers ONLY
//
// REMOVED:
//   - ChatGoogleGenerativeAI (LangChain) → not needed
//   - embedText / embedTexts             → replaced by 9_localEmbedding.js
//   - llm export                         → use genai directly instead
//
// EMBEDDINGS: now handled locally via 9_localEmbedding.js (zero API calls)
// =====================================================================

import dotenv from "dotenv";
import neo4j from "neo4j-driver";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// =====================================================================
// 1. NEO4J
// =====================================================================
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// =====================================================================
// 2. PINECONE (384 dims — matches local all-MiniLM-L6-v2 model)
// =====================================================================
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);

// =====================================================================
// 3. GEMINI (used ONLY for entity extraction + query answers)
//    NOT used for embeddings anymore
// =====================================================================
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// =====================================================================
// 4. CLOSE ALL CONNECTIONS
// =====================================================================
async function closeConnections() {
  await driver.close();
  console.log("✅ All connections closed.");
}

export { driver, pinecone, pineconeIndex, genai, closeConnections };