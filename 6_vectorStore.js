// // =====================================================================
// // 6_vectorStore.js — PDF → Chunks → Local Embeddings → Pinecone
// // =====================================================================
// //
// // WHAT CHANGED FROM ORIGINAL:
// //   BEFORE: import { embedText } from "./2_config.js"  ← Gemini API call
// //   AFTER:  import { localEmbed } from "./8_localEmbedding.js"  ← local, free
// //
// //   BEFORE: EMBED_CONCURRENCY = 5  ← caused 429s
// //   AFTER:  EMBED_CONCURRENCY = 8  ← local = no rate limits, can go higher
// //
// //   ADDED: checkpoint system (embed_checkpoint.json)
// //   If indexing crashes midway → re-run resumes from failure point
// //
// // WHY NO RETRY NEEDED FOR EMBEDDINGS NOW:
// //   Local model never throws 429. Only possible errors are OOM (unlikely)
// //   or corrupt text (skipped). Simple try/catch is enough.
// //
// // PINECONE DIMENSION NOTE:
// //   This file produces 384-dim vectors (all-MiniLM-L6-v2).
// //   Your Pinecone index MUST be created with dimension=384.
// //   If you had a 768-dim index before → delete it and recreate.
// // =====================================================================
// import fs from "fs";
// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
// const pdfParseModule = require("pdf-parse");
// const pdfParse = pdfParseModule.default || pdfParseModule;
// import { pineconeIndex } from "./2_config.js";
// import { localEmbed } from "./9_localEmbedding.js";  // ← replaces embedText

// // ── Constants ──
// const EMBED_CONCURRENCY = 8;       // local = no API limits, 8 parallel is fine
// const UPSERT_BATCH_SIZE = 100;
// const EMBED_CHECKPOINT_FILE = "./data/embed_checkpoint.json";

// // =====================================================================
// // STEP 1: Parse PDF → Raw Text
// // =====================================================================
// async function parsePDF(pdfPath) {
//   const buffer = fs.readFileSync(pdfPath);
//   const data = await pdfParse(buffer);
//   console.log(`   📄 Parsed PDF: ${data.numpages} pages, ~${data.text.length} characters`);
//   return data.text;
// }

// // =====================================================================
// // STEP 2: Chunk Text
// // =====================================================================
// function chunkText(rawText) {
//   const blocks = rawText.split(/\n-{5,}\n/);
//   const chunks = [];
//   for (const block of blocks) {
//     const text = block.trim();
//     if (!text || text.length < 20) continue;
//     chunks.push(text);
//   }
//   return chunks;
// }

// // =====================================================================
// // STEP 3: Embed one chunk (local — no retry needed, no rate limits)
// // =====================================================================
// async function embedChunk(text, chunkId) {
//   try {
//     return await localEmbed(text);
//   } catch (err) {
//     console.error(`   ❌ Chunk ${chunkId} embed failed: ${err.message?.substring(0, 100)}`);
//     return null;
//   }
// }

// // =====================================================================
// // Checkpoint helpers — saves progress so crashes don't restart from 0
// // =====================================================================
// function loadEmbedCheckpoint() {
//   try {
//     if (fs.existsSync(EMBED_CHECKPOINT_FILE)) {
//       const data = JSON.parse(fs.readFileSync(EMBED_CHECKPOINT_FILE, "utf8"));
//       console.log(`   ♻️  Found embed checkpoint: ${Object.keys(data).length} chunks already embedded`);
//       return data;
//     }
//   } catch (e) {
//     console.warn("   ⚠️  Could not read embed checkpoint:", e.message);
//   }
//   return {};
// }

// function saveEmbedCheckpoint(checkpoint) {
//   try {
//     if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
//     fs.writeFileSync(EMBED_CHECKPOINT_FILE, JSON.stringify(checkpoint));
//   } catch (e) {
//     console.warn("   ⚠️  Could not save embed checkpoint:", e.message);
//   }
// }

// // =====================================================================
// // MAIN: Parse → Chunk → Local Embed → Upsert
// // =====================================================================
// async function buildVectorStore(pdfPath) {
//   console.log(`\n📐 Building vector store from PDF (local embeddings)...`);
//   console.log(`   ⚡ No API calls for embeddings — local model only\n`);

//   const startTime = Date.now();

//   // Step 1: Parse PDF
//   console.log("   📄 Step 1: Parsing PDF...");
//   const rawText = await parsePDF(pdfPath);

//   // Step 2: Chunk
//   console.log("   ✂️  Step 2: Chunking text...");
//   const chunks = chunkText(rawText);
//   console.log(`   ✅ Created ${chunks.length} chunks`);

//   if (chunks.length === 0) {
//     console.error("   ❌ No chunks created! Check PDF format.");
//     return;
//   }

//   // Step 3: Embed with checkpoint
//   console.log(`\n   🧠 Step 3: Embedding ${chunks.length} chunks (local, no rate limits)...`);

//   const embedCheckpoint = loadEmbedCheckpoint();
//   const vectors = [];
//   let failCount = 0;
//   let skippedCount = 0;

//   // Restore already-done chunks from checkpoint
//   for (let i = 0; i < chunks.length; i++) {
//     const chunkId = `chunk-${i}`;
//     if (embedCheckpoint[chunkId]) {
//       vectors.push({
//         id: chunkId,
//         values: embedCheckpoint[chunkId],
//         metadata: { text: chunks[i] },
//       });
//       skippedCount++;
//     }
//   }

//   if (skippedCount > 0) {
//     console.log(`   ♻️  Restored ${skippedCount} chunks from checkpoint\n`);
//   }

//   // Find chunks that still need embedding
//   const pendingIndices = [];
//   for (let i = 0; i < chunks.length; i++) {
//     if (!embedCheckpoint[`chunk-${i}`]) {
//       pendingIndices.push(i);
//     }
//   }

//   console.log(`   🔄 ${pendingIndices.length} chunks need embedding...\n`);

//   // Process in parallel batches (local = no rate limits)
//   for (let batch = 0; batch < pendingIndices.length; batch += EMBED_CONCURRENCY) {
//     const batchIndices = pendingIndices.slice(batch, batch + EMBED_CONCURRENCY);
//     const roundNum = Math.floor(batch / EMBED_CONCURRENCY) + 1;
//     const totalRounds = Math.ceil(pendingIndices.length / EMBED_CONCURRENCY);

//     if ((roundNum - 1) % 20 === 0 || roundNum === totalRounds) {
//       console.log(`   🔄 Round ${roundNum}/${totalRounds} — ${vectors.length + skippedCount}/${chunks.length} done`);
//     }

//     const results = await Promise.all(
//       batchIndices.map(async (i) => {
//         const chunkId = `chunk-${i}`;
//         const embedding = await embedChunk(chunks[i], chunkId);
//         if (!embedding) return null;
//         return { id: chunkId, values: embedding, text: chunks[i] };
//       })
//     );

//     let savedThisRound = 0;
//     for (const r of results) {
//       if (r) {
//         embedCheckpoint[r.id] = r.values;
//         vectors.push({ id: r.id, values: r.values, metadata: { text: r.text } });
//         savedThisRound++;
//       } else {
//         failCount++;
//       }
//     }

//     // Save checkpoint every round
//     if (savedThisRound > 0) {
//       saveEmbedCheckpoint(embedCheckpoint);
//     }
//   }

//   const embedTime = ((Date.now() - startTime) / 1000).toFixed(1);
//   console.log(`\n   ✅ Embedded ${vectors.length}/${chunks.length} chunks in ${embedTime}s (${failCount} failed)`);

//   if (vectors.length === 0) {
//     console.error("   ❌ No vectors to upsert!");
//     return;
//   }

//   // Step 4: Upsert to Pinecone in batches of 100
//   console.log(`\n   📦 Step 4: Upserting ${vectors.length} vectors to Pinecone...`);
//   for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
//     const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
//     const batchNum = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
//     const totalBatches = Math.ceil(vectors.length / UPSERT_BATCH_SIZE);
//     console.log(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);
//     await pineconeIndex.upsert(batch);
//   }

//   const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

//   try {
//     const stats = await pineconeIndex.describeIndexStats();
//     console.log(`\n✅ Vector store built in ${totalTime}s! Total vectors: ${stats.totalRecordCount}`);
//   } catch (e) {
//     console.log(`\n✅ Vector store built in ${totalTime}s!`);
//   }

//   // Clean up embed checkpoint after full success
//   if (failCount === 0 && vectors.length === chunks.length) {
//     try { fs.unlinkSync(EMBED_CHECKPOINT_FILE); } catch (e) { /* ignore */ }
//     console.log("   🗑️  Embed checkpoint cleaned up");
//   }
// }

// export { buildVectorStore };

// =====================================================================
// 6_vectorStore.js — PDF → Chunks → Local Embeddings → Pinecone
// =====================================================================
//
// PDF PARSING: pdfjs-dist (pure JS, works in Node 22 ESM, deploy-safe)
//   pdf-parse is broken in Node 22 ESM — replaced with pdfjs-dist
//   Install: npm install pdfjs-dist
//
// EMBEDDINGS: local via 9_localEmbedding.js (zero API calls)
// CHECKPOINT: ./data/embed_checkpoint.json (resumes on re-run)
// =====================================================================

import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { pineconeIndex } from "./2_config.js";
import { localEmbed } from "./9_localEmbedding.js";

const EMBED_CONCURRENCY = 8;
const UPSERT_BATCH_SIZE = 100;
const EMBED_CHECKPOINT_FILE = "./data/embed_checkpoint.json";

// =====================================================================
// STEP 1: Parse PDF → Raw Text (pure JS via pdfjs-dist)
// =====================================================================
async function parsePDF(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  console.log(`   📄 PDF loaded: ${pdf.numPages} pages`);

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let pageText = "";
    for (const item of content.items) {
      pageText += item.str;
      if (item.hasEOL) pageText += "\n";
    }
    fullText += pageText + "\n";
  }

  console.log(`   ✅ Extracted ${fullText.length} chars from PDF`);
  return fullText;
}

// =====================================================================
// STEP 2: Chunk Text by movie separator (-----)
// =====================================================================
function chunkText(rawText) {
  const blocks = rawText.split(/\n?-{5,}\n/);
  const chunks = [];
  for (const block of blocks) {
    const text = block.trim();
    if (!text || text.length < 20) continue;
    chunks.push(text);
  }
  return chunks;
}

// =====================================================================
// STEP 3: Embed chunk (local — no rate limits, no API calls)
// =====================================================================
async function embedChunk(text, chunkId) {
  try {
    return await localEmbed(text);
  } catch (err) {
    console.error(`   ❌ Chunk ${chunkId} failed: ${err.message?.substring(0, 100)}`);
    return null;
  }
}

// =====================================================================
// Checkpoint helpers
// =====================================================================
function loadEmbedCheckpoint() {
  try {
    if (fs.existsSync(EMBED_CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(EMBED_CHECKPOINT_FILE, "utf8"));
      console.log(`   ♻️  Found embed checkpoint: ${Object.keys(data).length} chunks already done`);
      return data;
    }
  } catch (e) {
    console.warn("   ⚠️  Could not read embed checkpoint:", e.message);
  }
  return {};
}

function saveEmbedCheckpoint(checkpoint) {
  try {
    if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync(EMBED_CHECKPOINT_FILE, JSON.stringify(checkpoint));
  } catch (e) {
    console.warn("   ⚠️  Could not save embed checkpoint:", e.message);
  }
}

// =====================================================================
// MAIN: Parse → Chunk → Embed → Upsert
// =====================================================================
async function buildVectorStore(pdfPath) {
  console.log(`\n📐 Building vector store from PDF (local embeddings)...`);
  console.log(`   ⚡ Pure JS — no Python, no API calls, deploy-safe\n`);

  const startTime = Date.now();

  // Step 1: Parse PDF
  console.log("   📄 Step 1: Parsing PDF...");
  const rawText = await parsePDF(pdfPath);

  // Step 2: Chunk
  console.log("   ✂️  Step 2: Chunking text...");
  const chunks = chunkText(rawText);
  console.log(`   ✅ Created ${chunks.length} chunks`);

  if (chunks.length === 0) {
    console.error("   ❌ No chunks created! Check PDF format.");
    return;
  }

  // Step 3: Embed with checkpoint
  console.log(`\n   🧠 Step 3: Embedding ${chunks.length} chunks locally...`);

  const embedCheckpoint = loadEmbedCheckpoint();
  const vectors = [];
  let failCount = 0;
  let skippedCount = 0;

  // Restore already-done chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = `chunk-${i}`;
    if (embedCheckpoint[chunkId]) {
      vectors.push({
        id: chunkId,
        values: embedCheckpoint[chunkId],
        metadata: { text: chunks[i] },
      });
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    console.log(`   ♻️  Restored ${skippedCount} chunks from checkpoint`);
  }

  // Find pending chunks
  const pendingIndices = [];
  for (let i = 0; i < chunks.length; i++) {
    if (!embedCheckpoint[`chunk-${i}`]) pendingIndices.push(i);
  }

  console.log(`   🔄 ${pendingIndices.length} chunks need embedding...\n`);

  // Embed in parallel batches
  for (let batch = 0; batch < pendingIndices.length; batch += EMBED_CONCURRENCY) {
    const batchIndices = pendingIndices.slice(batch, batch + EMBED_CONCURRENCY);
    const roundNum = Math.floor(batch / EMBED_CONCURRENCY) + 1;
    const totalRounds = Math.ceil(pendingIndices.length / EMBED_CONCURRENCY);

    if ((roundNum - 1) % 20 === 0 || roundNum === totalRounds) {
      console.log(`   🔄 Round ${roundNum}/${totalRounds} — ${vectors.length}/${chunks.length} done`);
    }

    const results = await Promise.all(
      batchIndices.map(async (i) => {
        const chunkId = `chunk-${i}`;
        const embedding = await embedChunk(chunks[i], chunkId);
        if (!embedding) return null;
        return { id: chunkId, values: embedding, text: chunks[i] };
      })
    );

    let savedThisRound = 0;
    for (const r of results) {
      if (r) {
        embedCheckpoint[r.id] = r.values;
        vectors.push({ id: r.id, values: r.values, metadata: { text: r.text } });
        savedThisRound++;
      } else {
        failCount++;
      }
    }

    if (savedThisRound > 0) saveEmbedCheckpoint(embedCheckpoint);
  }

  const embedTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n   ✅ Embedded ${vectors.length}/${chunks.length} chunks in ${embedTime}s (${failCount} failed)`);

  if (vectors.length === 0) {
    console.error("   ❌ No vectors to upsert!");
    return;
  }

  // Step 4: Upsert to Pinecone
// Step 4: Upsert to Pinecone
// Filter out any empty/invalid vectors before upserting
const validVectors = vectors.filter(v => v && Array.isArray(v.values) && v.values.length > 0);
console.log(`\n   📦 Step 4: Upserting ${validVectors.length} valid vectors to Pinecone...`);

if (validVectors.length === 0) {
  console.error("   ❌ No valid vectors found! Clearing embed checkpoint to force re-embedding...");
  fs.unlinkSync(EMBED_CHECKPOINT_FILE);
  console.log("   🗑️  Embed checkpoint deleted. Re-run to re-embed.");
  return;
}

for (let i = 0; i < validVectors.length; i += UPSERT_BATCH_SIZE) {
  const batch = validVectors.slice(i, i + UPSERT_BATCH_SIZE);
  const batchNum = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(validVectors.length / UPSERT_BATCH_SIZE);
  console.log(`   📦 Batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);
  await pineconeIndex.upsert({ records: batch });
}

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  try {
    const stats = await pineconeIndex.describeIndexStats();
    console.log(`\n✅ Vector store built in ${totalTime}s! Total vectors: ${stats.totalRecordCount}`);
  } catch (e) {
    console.log(`\n✅ Vector store built in ${totalTime}s!`);
  }

  // Clean up on full success
  if (failCount === 0 && vectors.length === chunks.length) {
    try { fs.unlinkSync(EMBED_CHECKPOINT_FILE); } catch (e) { /* ignore */ }
    console.log("   🗑️  Embed checkpoint cleaned up");
  }
}

export { buildVectorStore };