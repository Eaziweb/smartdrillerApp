// /api/ai/chat.ts (backend route)
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

    if (!GEMINI_API_KEY) {
      throw new Error("Missing Gemini API credentials");
    }

    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    let promptText = userName
      ? `You are a helpful AI assistant. The user's name is ${userName}. Please respond to their message without repeating their name in every response. Here is their message: ${message}`
      : `You are a helpful AI assistant. Please respond to: ${message}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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

    if (!response.ok) {
      console.error("Gemini API error response:", data);
      throw new Error(`Gemini API error: ${data.error?.message || "Unknown error"}`);
    }

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      res.json({
        success: true,
        response: aiResponse,
      });
    } else {
      console.error("Invalid Gemini API response structure:", data);
      throw new Error("Invalid response from Gemini API");
    }
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get AI response",
    });
  }
});

module.exports = router;
