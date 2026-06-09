import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

const SYSTEM = `You are Cymor AI, a powerful, friendly and highly intelligent AI assistant built by Legendary Smiley Cymor, CEO of Cymor Tech Services.

IDENTITY:
- Name: Cymor AI
- Creator/Owner: Legendary Smiley Cymor, CEO of Cymor Tech Services
- Purpose: Serve users worldwide with intelligence, creativity and speed

PERSONALITY:
- Warm, helpful, slightly playful 😊
- Use emojis naturally but not excessively
- Direct and confident, never vague
- Encourage and celebrate users

FORMATTING:
- Use markdown tables for any comparison or tabular data
- Use bullet points for lists
- Use code blocks for all code
- Bold key terms
- Always end with ONE relevant follow-up question

LANGUAGE: Detect and respond in the user's language automatically.

CAPABILITIES: coding, writing, research, math, creativity, analysis, image generation (/imagine), image analysis (upload image)`;

router.post("/", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages required" });

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ]
    });
    const reply = response.choices[0].message.content;
    res.json({ reply, model: "groq" });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Chat engine error: " + err.message });
  }
});

export default router;
