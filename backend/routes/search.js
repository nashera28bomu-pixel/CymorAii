import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

// Web search using Groq with Tavily-style prompt or direct Groq tool use
// Since we're on free tier, we simulate web search results via Groq's trained knowledge
// For real-time results, swap in Tavily or SerpAPI free tier

router.post("/", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Try Tavily free tier if key present
    if (process.env.TAVILY_API_KEY) {
      const tv = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: "basic", max_results: 5 })
      });
      if (tv.ok) {
        const tvData = await tv.json();
        const snippets = tvData.results?.map((r, i) => `${i+1}. **${r.title}**\n${r.content}\nSource: ${r.url}`).join("\n\n") || "";
        const summary = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1024,
          messages: [
            { role: "system", content: "You are Cymor AI. Summarize these search results clearly and helpfully with emojis. Format nicely with markdown. End with a follow-up question." },
            { role: "user", content: `Search query: "${query}"\n\nResults:\n${snippets}` }
          ]
        });
        return res.json({ reply: summary.choices[0].message.content, model: "search" });
      }
    }

    // Fallback: Groq knowledge-based search response
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        { role: "system", content: "You are Cymor AI. Answer the search query thoroughly using your training knowledge. Be detailed, use markdown formatting, tables where helpful, emojis. Note if info might be outdated. End with a follow-up question." },
        { role: "user", content: `🔍 Search: ${query}` }
      ]
    });
    res.json({ reply: response.choices[0].message.content, model: "search" });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: "Search failed: " + err.message });
  }
});

export default router;
