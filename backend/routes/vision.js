import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

const VISION_SYSTEM = `You are Cymor AI's vision engine. Analyze images thoroughly and helpfully. 
Describe what you see, answer questions about the image, extract text if present, identify objects, people, scenes, emotions, etc.
Be detailed but concise. Use emojis naturally. End with a follow-up question about the image.
Respond in the same language the user used in their prompt.`;

router.post("/", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", prompt = "Analyze this image in detail" } = req.body;

  if (!imageBase64) return res.status(400).json({ error: "Image data required" });

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { text: VISION_SYSTEM + "\n\nUser prompt: " + prompt },
      { inlineData: { mimeType, data: imageBase64 } }
    ]);

    const reply = result.response.text();
    res.json({ reply, model: "gemini-vision" });
  } catch (err) {
    console.error("Vision error:", err.message);
    res.status(500).json({ error: "Vision engine error: " + err.message });
  }
});

export default router;
