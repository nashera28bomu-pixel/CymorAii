import express from "express";

const router = express.Router();

const STYLE_PRESETS = {
  realistic: "photorealistic, 8k, detailed, sharp focus, professional photography",
  anime: "anime style, manga, vibrant colors, Studio Ghibli inspired",
  sketch: "pencil sketch, hand-drawn, artistic, detailed linework",
  oil: "oil painting, impressionist, textured, artistic masterpiece",
  cyberpunk: "cyberpunk, neon lights, futuristic, dark atmosphere, sci-fi",
  watercolor: "watercolor painting, soft colors, artistic, flowing"
};

router.post("/", async (req, res) => {
  const { prompt, style = "realistic" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt required" });

  const styleEnhancer = STYLE_PRESETS[style] || STYLE_PRESETS.realistic;
  const fullPrompt = `${prompt}, ${styleEnhancer}, high quality`;

  try {
    const HF_TOKEN = process.env.HF_TOKEN;
    const model = "black-forest-labs/FLUX.1-schnell";

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: { num_inference_steps: 4 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      // Model loading
      if (response.status === 503) {
        return res.status(503).json({ error: "Model is loading, please try again in 30 seconds ⏳" });
      }
      throw new Error(errText);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    res.json({ image: `data:image/jpeg;base64,${base64}`, prompt: fullPrompt });
  } catch (err) {
    console.error("Imagine error:", err.message);
    res.status(500).json({ error: "Image generation error: " + err.message });
  }
});

export default router;
