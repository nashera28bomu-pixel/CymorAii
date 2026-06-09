import express from "express";

const router = express.Router();

const STYLES = {
  realistic: "photorealistic, 8k uhd, detailed, sharp focus, professional photography, masterpiece",
  anime: "anime style, manga art, vibrant colors, Studio Ghibli inspired, detailed illustration",
  sketch: "pencil sketch, hand-drawn, charcoal, detailed linework, artistic, black and white",
  oil: "oil painting, impressionist brushwork, textured canvas, artistic masterpiece, renaissance style",
  cyberpunk: "cyberpunk, neon lights, futuristic cityscape, dark atmosphere, sci-fi, blade runner style",
  watercolor: "watercolor painting, soft flowing colors, artistic, dreamy, transparent layers"
};

// Retry with exponential backoff for model loading
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 503) {
      const errJson = await res.json().catch(() => ({}));
      const wait = errJson.estimated_time ? Math.ceil(errJson.estimated_time * 1000) : 20000;
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, Math.min(wait, 25000)));
        continue;
      }
      return { ok: false, status: 503, _body: errJson };
    }
    return res;
  }
}

router.post("/", async (req, res) => {
  const { prompt, style = "realistic" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const styleTag = STYLES[style] || STYLES.realistic;
  const fullPrompt = `${prompt}, ${styleTag}, high quality, award winning`;

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return res.status(500).json({ error: "HF_TOKEN not configured on server" });

  // Try FLUX first, fallback to SD-XL
  const models = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0"
  ];

  for (const model of models) {
    try {
      const response = await fetchWithRetry(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: fullPrompt, parameters: { num_inference_steps: model.includes("FLUX") ? 4 : 20 } })
        }
      );

      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();
      // Detect content type from response headers
      const ct = response.headers?.get("content-type") || "image/jpeg";
      const base64 = Buffer.from(buffer).toString("base64");
      return res.json({ image: `data:${ct};base64,${base64}`, prompt: fullPrompt, model });
    } catch (err) {
      console.error(`Model ${model} failed:`, err.message);
      continue;
    }
  }

  res.status(500).json({ error: "All image models failed. Check your HF_TOKEN and try again ⏳" });
});

export default router;
