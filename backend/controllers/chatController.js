// =====================================================================
// backend/controllers/chatController.js
// =====================================================================
// UPDATED: reads optional apiKey from request body
// Frontend sends: { message: "...", apiKey: "AIza..." }
// =====================================================================

import { processQuery } from "../services/graphRagService.js";

export async function chat(req, res) {
  try {
    const { message, apiKey } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // apiKey is optional — null means use server's default key
    const result = await processQuery(message.trim(), apiKey || null);
    res.json(result);

  } catch (err) {
    console.error("Chat error:", err.message);

    // Detect invalid API key error from Gemini
    const isInvalidKey = err.message?.includes("API_KEY_INVALID") ||
                         err.message?.includes("401") ||
                         err.message?.includes("403");

    res.status(isInvalidKey ? 401 : 500).json({
      error: isInvalidKey
        ? "Invalid API key. Please check your Gemini API key and try again."
        : err.message,
    });
  }
}