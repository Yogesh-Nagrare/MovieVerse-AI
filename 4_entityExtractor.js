// =====================================================================
// 4_entityExtractor.js — STEP 2: PDF → Gemini flash-lite → JSON
// =====================================================================
//
// FREE TIER STRATEGY:
//   gemini-2.5-flash-lite → 1000 RPD free
//   batchSize = 50  → 20 API calls for 1000 movies (safer output size)
//   CONCURRENCY = 1 → serial, prevents 429s
//   DELAY = 7s      → ~8 RPM, safely under 15 RPM limit
//
// FAILED BATCHES:
//   If a batch fails all 3 attempts → log warning and SKIP it
//   Do NOT save to checkpoint → next re-run will retry it
//   Pipeline continues with remaining batches
//
// CHECKPOINT:
//   Saves to ./data/checkpoint.json after every successful batch
//   Re-run resumes from where it left off
// =====================================================================

import { genai } from "./2_config.js";
import { createPartFromUri } from "@google/genai";
import fs from "fs";

const MODEL = "gemini-2.5-flash-lite";
const BATCH_SIZE = 50;               // 50 per batch = safer JSON output size
const BETWEEN_BATCH_DELAY_MS = 7000; // 7s gap = ~8 RPM
const CHECKPOINT_FILE = "./data/checkpoint.json";

const EXTRACTION_PROMPT = `You are a precise entity extractor for a movie knowledge graph.

From the attached PDF, extract movies {START} through {END} (by their order in the document).

For EACH movie, output this EXACT JSON structure:
{
  "movie": {"title": "string", "year": number},
  "director": {"name": "string"},
  "actors": ["string"],
  "genres": ["string"],
  "themes": ["string"],
  "awards": ["string"]
}

Rules:
- If awards say "None", return awards as empty array []
- Keep exact names as written in the PDF
- Year must be a number, not string
- Return a JSON ARRAY of objects: [{...}, {...}, ...]
- Return ONLY valid JSON. No markdown, no backticks, no explanation.`;

// ── Checkpoint helpers ──
function loadCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
      console.log(`   ♻️  Checkpoint found: ${Object.keys(data).length} batches already done`);
      return data;
    }
  } catch (e) {
    console.warn("   ⚠️  Could not read checkpoint, starting fresh:", e.message);
  }
  return {};
}

function saveCheckpoint(checkpoint) {
  try {
    if (!fs.existsSync("./data")) fs.mkdirSync("./data", { recursive: true });
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  } catch (e) {
    console.warn("   ⚠️  Could not save checkpoint:", e.message);
  }
}

// ── Upload PDF to Gemini Files API ──
async function uploadPDF(pdfPath) {
  console.log("   📤 Uploading PDF to Gemini Files API...");

  const file = await genai.files.upload({
    file: pdfPath,
    config: { mimeType: "application/pdf" },
  });

  let fileInfo = await genai.files.get({ name: file.name });
  while (fileInfo.state === "PROCESSING") {
    console.log("   ⏳ PDF processing...");
    await new Promise((r) => setTimeout(r, 3000));
    fileInfo = await genai.files.get({ name: file.name });
  }

  if (fileInfo.state === "FAILED") {
    throw new Error("PDF upload processing failed");
  }

  console.log(`   ✅ PDF uploaded: ${file.name}`);
  return fileInfo;
}

// ── Extract one batch with retry ──
// Returns: array of movies on success, null on all retries exhausted
async function extractBatch(fileInfo, start, end, attempt = 1) {
  const maxRetries = 3;
  const prompt = EXTRACTION_PROMPT
    .replace("{START}", start)
    .replace("{END}", end);

  try {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            createPartFromUri(fileInfo.uri, fileInfo.mimeType),
            { text: prompt },
          ],
        },
      ],
    });

    let raw = response.text.trim();
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];

  } catch (err) {
    if (attempt < maxRetries) {
      const is429 = err.message?.includes("429") || err.status === 429;
      const waitSec = is429 ? 65 : 15;
      console.warn(`   ⚠️  ${is429 ? "Rate limited (429)" : "Error: " + err.message?.substring(0, 60)}. Waiting ${waitSec}s (retry ${attempt + 1}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      return extractBatch(fileInfo, start, end, attempt + 1);
    }

    // All retries exhausted → return null (caller will skip + warn)
    return null;
  }
}

// ── Main extraction function ──
async function extractAllEntities(pdfPath, totalMovies = 1000, batchSize = BATCH_SIZE) {
  const checkpoint = loadCheckpoint();

  // Build batch list
  const allBatches = [];
  const totalBatches = Math.ceil(totalMovies / batchSize);
  for (let i = 0; i < totalBatches; i++) {
    allBatches.push({
      start: i * batchSize + 1,
      end: Math.min((i + 1) * batchSize, totalMovies),
    });
  }

  // Check if everything already done
  const pendingBatches = allBatches.filter(b => !checkpoint[`${b.start}-${b.end}`]);

  if (pendingBatches.length === 0) {
    console.log("   ✅ All batches already in checkpoint. Skipping PDF upload.");
    const results = [];
    for (const batch of allBatches) {
      const key = `${batch.start}-${batch.end}`;
      if (checkpoint[key]) results.push(...checkpoint[key]);
    }
    console.log(`\n✅ Loaded ${results.length} movies from checkpoint`);
    return results;
  }

  // Upload PDF
  const fileInfo = await uploadPDF(pdfPath);

  // Pre-load completed batches
  const results = [];
  for (const batch of allBatches) {
    const key = `${batch.start}-${batch.end}`;
    if (checkpoint[key]) results.push(...checkpoint[key]);
  }

  console.log(`\n   📊 ${pendingBatches.length} batches remaining, ${results.length} movies already done\n`);

  // Track skipped batches for final summary
  const skippedBatches = [];

  // Process pending batches serially
  for (let i = 0; i < pendingBatches.length; i++) {
    const batch = pendingBatches[i];
    const key = `${batch.start}-${batch.end}`;

    console.log(`🤖 [${i + 1}/${pendingBatches.length}] Movies ${key}...`);

    const batchResults = await extractBatch(fileInfo, batch.start, batch.end);

    if (batchResults !== null && batchResults.length > 0) {
      // Success → save to checkpoint
      checkpoint[key] = batchResults;
      saveCheckpoint(checkpoint);
      results.push(...batchResults);
      console.log(`   ✅ Got ${batchResults.length} movies. Total: ${results.length}. Checkpoint saved.`);
    } else {
      // Failed all retries → skip with warning, do NOT save to checkpoint
      skippedBatches.push(key);
      console.warn(`   ⚠️  SKIPPING batch ${key} — all retries failed. Will retry on next run.`);
    }

    // Wait between batches (skip after last)
    if (i < pendingBatches.length - 1) {
      console.log(`   ⏳ Waiting ${BETWEEN_BATCH_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, BETWEEN_BATCH_DELAY_MS));
    }
  }

  // Cleanup PDF from Gemini servers
  try {
    await genai.files.delete({ name: fileInfo.name });
    console.log("   🗑️  PDF deleted from Gemini servers");
  } catch (e) { /* auto-deletes in 48h anyway */ }

  // Final summary
  console.log(`\n✅ Total extracted: ${results.length}/${totalMovies} movies`);

  if (skippedBatches.length > 0) {
    console.warn(`⚠️  ${skippedBatches.length} batch(es) skipped due to repeated failures:`);
    skippedBatches.forEach(b => console.warn(`   - Movies ${b}`));
    console.warn(`   Re-run indexing to retry these batches.`);
  }

  return results;
}

export { extractAllEntities, uploadPDF };