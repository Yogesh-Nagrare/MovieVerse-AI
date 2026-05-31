// =====================================================================
// 2_config.js — ALL CONNECTIONS IN ONE PLACE
// =====================================================================
// UPDATED: getGenai(apiKey) returns a Gemini instance with the given
// key — used by query handlers to support user-provided API keys
// =====================================================================

import dotenv from "dotenv";
import neo4j from "neo4j-driver";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// ── Neo4j ──
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// ── Pinecone ──
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);

// ── Default Gemini (your key) ──
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Dynamic Gemini: returns instance with user key if provided ──
// Usage: const g = getGenai(userApiKey); → uses user key
//        const g = getGenai();           → uses your key
function getGenai(userApiKey) {
  if (userApiKey && typeof userApiKey === "string" && userApiKey.trim().length > 10) {
    return new GoogleGenAI({ apiKey: userApiKey.trim() });
  }
  return genai;
}

async function closeConnections() {
  await driver.close();
  console.log("✅ All connections closed.");
}

export { driver, pinecone, pineconeIndex, genai, getGenai, closeConnections };