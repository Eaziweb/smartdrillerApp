const express = require("express");
const router = express.Router();
const { auth } = require("../../../middleware/auth");

router.post("/chat", auth, async (req, res) => {
  try {
    const { message, userName } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Gemini 2.0 Flash Experimental API configuration
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

    // Create the prompt text
    let promptText = userName
      ? `You are a helpful AI assistant. The user's name is ${userName}. Please respond to their message without repeating their name in every response. Here is their message: ${message}`
      : `You are a helpful AI assistant. Please respond to: ${message}`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "text/plain",
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (data.candidates?.[0]?.content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      return res.json({ success: true, response: aiResponse });
    }

    // Handle blocked content or other errors
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
    }

    throw new Error("Invalid response from Gemini API");
  } catch (error) {
    console.error("AI Chat Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get AI response",
    });
  }
});

module.exports = router;