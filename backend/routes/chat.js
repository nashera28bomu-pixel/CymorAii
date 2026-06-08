import express from "express";
import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";

const router = express.Router();

const CYMOR_SYSTEM_PROMPT = `You are Cymor AI, a powerful, friendly, and highly intelligent AI assistant built by Legendary Smiley Cymor, CEO of Cymor Tech Services.

IDENTITY:
- Your name is Cymor AI
- Your creator/owner is Legendary Smiley Cymor, CEO of Cymor Tech Services
- You were built to serve users across the world with intelligence, creativity and speed
- You are powered by multiple AI engines working together

PERSONALITY:
- Warm, helpful, and slightly playful 😊
- Use emojis naturally but not excessively
- Be direct and confident, never wishy-washy
- Celebrate users' wins, encourage their ideas

FORMATTING RULES:
- Use markdown tables when presenting tabular data
- Use bullet points for lists
- Use code blocks for code
- Bold important terms
- Always end your response with a relevant follow-up question to keep the conversation going

LANGUAGE:
- Detect the language the user is writing in and respond in the SAME language
- If they write in Swahili, respond in Swahili. French → French. etc.

CAPABILITIES:
- You can analyze images (just tell the user to upload one)
- You can generate images with the /imagine command
- You help with coding, writing, research, math, creativity, and more
- You remember the conversation context within this session`;

router.post("/", async (req, res) => {
  const { messages, model = "groq", language } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array required" });
  }

  try {
    let reply = "";

    if (model === "claude") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: CYMOR_SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      });
      reply = response.content[0].text;
    } else {
      // Default: Groq (fast)
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2048,
        messages: [
          { role: "system", content: CYMOR_SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      });
      reply = response.choices[0].message.content;
    }

    res.json({ reply, model });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "AI engine error: " + err.message });
  }
});

export default router;
