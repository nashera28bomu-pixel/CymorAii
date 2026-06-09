import express from "express";

const router = express.Router();

const STYLES = {
  realistic: "photorealistic, 8k uhd, detailed, sharp focus, professional photography",
  anime:     "anime style, manga art, vibrant colors, Studio Ghibli inspired",
  sketch:    "pencil sketch, hand-drawn, charcoal, detailed linework, black and white",
  oil:       "oil painting, impressionist, textured canvas, artistic masterpiece",
  cyberpunk: "cyberpunk, neon lights, futuristic, dark atmosphere, blade runner",
  watercolor:"watercolor painting, soft flowing colors, dreamy, artistic"
};

// ── Pollinations.ai — completely free, no token needed ──
async function tryPollinations(prompt) {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&nologo=true&enhance=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Pollinations failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const ct = res.headers.get("content-type") || "image/jpeg";
  return { base64, ct, source: "pollinations" };
}

// ── HuggingFace — needs HF_TOKEN ──
async function tryHuggingFace(prompt, hfToken) {
  if (!hfToken) throw new Error("No HF_TOKEN");

  const models = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5"
  ];

  for (const model of models) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: model.includes("FLUX") ? 4 : 20 } }),
        signal: AbortSignal.timeout(90000)
      });

      if (res.status === 503) {
        // Model loading — wait and retry once
        await new Promise(r => setTimeout(r, 15000));
        const res2 = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: prompt }),
          signal: AbortSignal.timeout(90000)
        });
        if (!res2.ok) continue;
        const buf = await res2.arrayBuffer();
        return { base64: Buffer.from(buf).toString("base64"), ct: "image/jpeg", source: model };
      }

      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      return { base64: Buffer.from(buf).toString("base64"), ct: res.headers.get("content-type") || "image/jpeg", source: model };
    } catch (e) {
      console.log(`HF model ${model} failed: ${e.message}`);
      continue;
    }
  }
  throw new Error("All HF models failed");
}

router.post("/", async (req, res) => {
  const { prompt, style = "realistic" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt required" });

  const styleTag = STYLES[style] || STYLES.realistic;
  const fullPrompt = `${prompt}, ${styleTag}, high quality`;

  console.log(`🎨 Generating: "${fullPrompt.slice(0, 80)}..."`);

  // Try HuggingFace first (better quality), fall back to Pollinations (always free)
  let result;

  try {
    result = await tryHuggingFace(fullPrompt, process.env.HF_TOKEN);
    console.log(`✅ HF success: ${result.source}`);
  } catch (hfErr) {
    console.log(`⚠️ HF failed (${hfErr.message}), trying Pollinations...`);
    try {
      result = await tryPollinations(fullPrompt);
      console.log(`✅ Pollinations success`);
    } catch (polErr) {
      console.log(`❌ Pollinations failed: ${polErr.message}`);
      return res.status(500).json({ error: "Image generation unavailable. Please try again in a moment ⏳" });
    }
  }

  res.json({
    image: `data:${result.ct};base64,${result.base64}`,
    prompt: fullPrompt,
    source: result.source
  });
});

export default router;
