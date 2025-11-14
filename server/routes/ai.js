// src/server/routes/ai.js
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

    // <CHANGE> Get Gemini API configuration with validation
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = process.env.GEMINI_API_URL;

    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      console.error("[v0] Missing Gemini API credentials in env");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // ... existing code ...

    // <CHANGE> Build request body for Gemini
    let promptText = "";
    if (userName) {
      promptText = `You are a helpful AI assistant. The user's name is ${userName}. Please respond to their message without repeating their name in every response. Here is their message: ${message}`;
    } else {
      promptText = `You are a helpful AI assistant. Please respond to: ${message}`;
    }

    const requestBody = {
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
    };

    // <CHANGE> Fix API call with proper error checking and debugging
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // <CHANGE> Check HTTP status before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[v0] Gemini API HTTP Error:", response.status, errorText);
      return res.status(500).json({
        success: false,
        message: "AI service returned an error",
      });
    }

    const data = await response.json();
    console.log("[v0] Gemini Response:", JSON.stringify(data, null, 2)); // <CHANGE> Debug log

    // <CHANGE> Better response validation with debugging
    if (data.error) {
      console.error("[v0] Gemini API Error:", data.error);
      return res.status(500).json({
        success: false,
        message: "AI service error: " + (data.error.message || "Unknown error"),
      });
    }

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      const aiResponse = data.candidates[0].content.parts[0].text;

      res.json({
        success: true,
        response: aiResponse,
      });
    } else {
      console.error("[v0] Unexpected Gemini response structure:", data);
      res.status(500).json({
        success: false,
        message: "Invalid response format from AI",
      });
    }
  } catch (error) {
    console.error("[v0] AI Chat Error:", error.message, error);
    res.status(500).json({
      success: false,
      message: "Failed to process AI request",
    });
  }
});

module.exports = router;