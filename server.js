// =====================================================================
// server.js — Express Backend for Movie GraphRAG
// =====================================================================
// FIXES from original:
//   1. CORS origin from env var (not hardcoded) → works in all environments
//   2. PORT from env var → required for Railway/Render deployment
//   3. Added /health endpoint → deployment platforms need this
//   4. Graceful shutdown → closes Neo4j connections properly
// =====================================================================

import express from "express";
import cors from "cors";
import chatRoutes from "./backend/routes/chatRoutes.js";
import { closeConnections } from "./2_config.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──
// In .env: FRONTEND_URL=https://your-frontend.vercel.app
// Locally: FRONTEND_URL=http://localhost:5173
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173"]
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// ── Routes ──
app.use("/api/chat", chatRoutes);

// ── Health check (required by Railway/Render) ──
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Movie GraphRAG API" });
});

app.get("/", (req, res) => {
  res.json({ message: "Movie GraphRAG API Running", health: "/health" });
});

// ── Start ──
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// ── Graceful shutdown (closes Neo4j connections) ──
async function shutdown() {
  console.log("Shutting down...");
  server.close();
  await closeConnections();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);