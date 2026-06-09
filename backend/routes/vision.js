import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

const VISION_SYSTEM = `You are Cymor AI's vision engine. Analyze images thoroughly and helpfully.
Describe what you see, answer questions, extract text, identify objects, scenes, emotions, etc.
Be detailed but concise. Use emojis naturally. End with ONE follow-up question.
Respond in the same language the user used.`;

router.post("/", async (req, res) => {
  const { imageBase64, mimeType = "image/jpeg", prompt = "Analyze this image in detail" } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "Image data required" });

  // Try models in order until one works
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro-vision"
  ];

  for (const modelName of modelsToTry) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        { text: VISION_SYSTEM + "\n\nUser: " + prompt },
        { inlineData: { mimeType, data: imageBase64 } }
      ]);

      const reply = result.response.text();
      console.log(`✅ Vision worked with: ${modelName}`);
      return res.json({ reply, model: "gemini-vision" });
    } catch (err) {
      console.log(`❌ ${modelName} failed: ${err.message}`);
      continue;
    }
  }

  // All Gemini models failed — fallback to Groq describing the image metadata
  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [{ role: "user", content: `The user uploaded an image and asked: "${prompt}". Unfortunately the vision API is unavailable. Tell them you can see they uploaded an image but vision is temporarily unavailable, and suggest they describe what's in the image so you can still help.` }]
    });
    return res.json({ reply: response.choices[0].message.content, model: "gemini-vision" });
  } catch (e) {
    res.status(500).json({ error: "Vision unavailable. Please check your GEMINI_API_KEY and ensure the Generative Language API is enabled in Google Cloud Console." });
  }
});

export default router;
