import { processQuery } from "../services/graphRagService.js";

export async function chat(req, res) {

  try {

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message required"
      });
    }

    const result =
      await processQuery(message);

    res.json(result);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
}