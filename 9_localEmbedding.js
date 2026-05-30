// =====================================================================
// 8_localEmbedding.js — Local embeddings via @huggingface/transformers
// =====================================================================
//
// WHY LOCAL EMBEDDINGS:
//   Gemini embedding free tier = 1000 RPD
//   Local model = unlimited, zero API calls, zero cost
//   Quality is perfectly fine for semantic movie search
//
// MODEL: Xenova/all-MiniLM-L6-v2
//   - Output dimensions: 384
//   - Size: ~23MB (downloads once, cached in ./node_modules/.cache)
//   - Fast: ~5-20ms per embed on CPU
//   - No internet needed after first download
//
// ⚠️  PINECONE INDEX MUST BE 384 DIMENSIONS
//   If your existing Pinecone index is 768 dims (Gemini default),
//   you MUST delete it and recreate it at 384 dims.
//   See README or 7_runIndexing.js for instructions.
//
// SINGLETON PATTERN:
//   Pipeline loads once on first call (~2-3s model load).
//   All subsequent calls reuse the same loaded model instantly.
//   This is critical — do NOT call pipeline() on every embed.
// =====================================================================

import { pipeline } from "@huggingface/transformers";

// Singleton: pipeline loaded once, reused everywhere
let _extractor = null;

async function getExtractor() {
  if (!_extractor) {
    console.log("   🤖 Loading local embedding model (first time ~2-3s)...");
    _extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
      // No device option needed — runs on CPU by default, works everywhere
    );
    console.log("   ✅ Local embedding model loaded (384 dims)");
  }
  return _extractor;
}

/**
 * Embed a single text string.
 * Returns: number[] of length 384
 */
async function localEmbed(text) {
  const extractor = await getExtractor();

  const output = await extractor(text, {
    pooling: "mean",    // average token embeddings → single vector
    normalize: true,    // L2 normalize → cosine similarity works correctly
  });

  // output.data is Float32Array — convert to plain JS array for Pinecone
  return Array.from(output.data);
}

export { localEmbed };