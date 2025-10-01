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

    // Gemini API configuration (from .env)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = process.env.GEMINI_API_URL;

    // Create the prompt text
    let promptText = "";
    
    // Only include the user's name in the first message to establish context
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

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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