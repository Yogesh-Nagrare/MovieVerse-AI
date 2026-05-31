// =====================================================================
// backend/controllers/chatController.js
// =====================================================================

import { processQuery } from "../services/graphRagService.js";

export async function chat(req, res) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const result = await processQuery(message.trim());
    res.json(result);

  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
}