// /api/ai/chat.js (backend route)
const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");

router.post("/chat", auth, async (req, res) => {
  try {
    const { message, userName } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = process.env.GEMINI_API_URL;

    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      throw new Error("Missing Gemini API credentials");
    }

    let promptText = userName
      ? `You are a helpful AI assistant. The user's name is ${userName}. Please respond to their message without repeating their name in every response. Here is their message: ${message}`
      : `You are a helpful AI assistant. Please respond to: ${message}`;

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      res.json({
        success: true,
        response: aiResponse,
      });
    } else {
      throw new Error("Invalid response from Gemini API");
    }
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get AI response",
    });
  }
});

module.exports = router;