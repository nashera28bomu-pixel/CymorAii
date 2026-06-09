# 🤖 Cymor AI — Intelligent Assistant
**Built by Legendary Smiley Cymor · CEO, Cymor Tech Services**

A powerful multi-brain AI assistant powered by Groq, Claude & Gemini. No login required. PWA installable.

---

## ✨ Features
- ⚡ **Groq** (Llama 3.3 70B) — blazing fast chat
- 🧠 **Claude Haiku** — deep reasoning & code
- 👁️ **Gemini Vision** — analyze uploaded images
- 🎨 **Image Generation** — `/imagine` with 6 style presets (FLUX.1)
- 💬 **Persistent Chat History** — localStorage, no DB needed
- 📌 **Pin & organize** chats
- 🔁 **Regenerate** any response
- 📝 **Summarize** long chats in one tap
- 🎙️ **Voice Input** — Web Speech API (free)
- 🔊 **Text-to-Speech** — speak any response
- 📤 **Share** responses via WhatsApp/Telegram
- 🌍 **Auto language detection** — responds in your language
- 📊 **Table rendering** — markdown tables → HTML
- 🌙 **Dark/Light mode**
- 📱 **PWA installable** — manifest + service worker
- 📎 **Image upload** → Gemini analyzes it
- ✍️ **Typewriter effect** on responses

---

## 🚀 Deployment

### Backend → Render (Free)

1. Push `backend/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set environment variables:

```
GROQ_API_KEY       = from console.groq.com (free)
ANTHROPIC_API_KEY  = from console.anthropic.com
GEMINI_API_KEY     = from aistudio.google.com (free)
HF_TOKEN           = from huggingface.co/settings/tokens (free)
```

5. Build: `npm install` | Start: `npm start`
6. Copy your Render URL (e.g. `https://cymor-ai.onrender.com`)

### Frontend → Netlify (Free)

1. Open `frontend/app.js`
2. Change line 6: `const BACKEND = "https://your-backend.onrender.com";`
   → paste your actual Render URL
3. Push `frontend/` to GitHub
4. Go to [netlify.com](https://netlify.com) → Deploy from GitHub
5. Done! Your PWA is live 🎉

### Icons
Generate icons at [realfavicongenerator.net](https://realfavicongenerator.net)
- Save `icon-192.png` and `icon-512.png` to `frontend/icons/`

---

## 📁 Project Structure

```
cymor-ai/
├── backend/
│   ├── server.js          # Express server
│   ├── routes/
│   │   ├── chat.js        # Groq + Claude
│   │   ├── vision.js      # Gemini Vision
│   │   └── imagine.js     # HuggingFace FLUX
│   ├── package.json
│   ├── .env.example
│   └── render.yaml
└── frontend/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── manifest.json
    ├── sw.js              # Service Worker
    ├── _redirects         # Netlify SPA routing
    └── icons/
        ├── icon-192.png
        └── icon-512.png
```

---

## 🎨 /imagine Command

Type `/imagine` followed by your prompt:
```
/imagine a lion wearing a crown in Nairobi
/imagine futuristic Kenyan village at sunset, anime style
```

Choose a style from the dropdown: Realistic, Anime, Sketch, Oil Painting, Cyberpunk, Watercolor

> ⏳ Note: HuggingFace free tier may take 30–60s. Model cold starts can take 2min.

---

## 💡 Tips
- **Shift+Enter** = new line in input
- Click 📎 to upload an image for analysis
- Click 🎙️ to use voice input
- Click 🔊 FAB to enable text-to-speech
- Use the model selector to choose your AI brain per message
- Pin important chats with 📌

---

## 👑 Owner
**Legendary Smiley Cymor**  
CEO · Cymor Tech Services  
Building zero-budget, high-impact tools for the Kenyan market.
