/* ═══════════════════════════════════════
   CYMOR AI — app.js v2
   All fixes applied
═══════════════════════════════════════ */

const BACKEND = "https://cymorai.onrender.com"; // ← CHANGE THIS

const WELCOMES = [
  "How may I help you today? 😊",
  "What can I create for you? ✨",
  "Ready to think big together! 🚀",
  "Ask me anything — I'm all ears 👂",
  "What's on your mind? 💭",
  "Let's build something great! 🛠️",
  "Your intelligent assistant is ready ⚡",
  "Habari! Nikusaidie nini leo? 🇰🇪",
  "What problem shall we solve? 🧩",
  "Powered and ready for you! 🔥",
  "Describe what you need — I'll handle it 🎯",
  "New day, new ideas. Let's go! 🌅"
];

/* ── STATE ── */
let chats        = JSON.parse(localStorage.getItem("cy_chats") || "[]");
let activeId     = null;
let stats        = JSON.parse(localStorage.getItem("cy_stats") || '{"msgs":0,"imgs":0}');
let sessionMsgs  = 0;
let installEvt   = null;
let installShown = false;
let ratingShown  = false;
let uploadedImg  = null;
let uploadedMime = null;
let recognition  = null;
let isListening  = false;

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  // Splash out
  setTimeout(() => {
    const sp = document.getElementById("splash");
    sp.classList.add("hide");
    setTimeout(() => sp.remove(), 600);
  }, 3100);

  // Restore theme
  const t = localStorage.getItem("cy_theme");
  if (t) {
    document.documentElement.setAttribute("data-theme", t);
    document.getElementById("themeBtn").textContent = t === "light" ? "☀️" : "🌙";
  }

  // Welcome
  document.getElementById("wlcMsg").textContent = WELCOMES[Math.floor(Math.random() * WELCOMES.length)];

  renderChatList();
  updateStats();

  // Voice recognition
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join("");
      const inp = document.getElementById("msgInput");
      inp.value = t;
      resize(inp);
      checkImagine(t);
    };
    recognition.onend = () => {
      isListening = false;
      document.getElementById("voiceBtn").classList.remove("listening");
    };
  }

  // PWA install prompt capture
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    installEvt = e;
  });

  // SW
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  // Enter = newline hint
  const inp = document.getElementById("msgInput");
  inp.addEventListener("focus", () => {
    document.querySelector(".input-hint-inline").style.display = "block";
  });
});

/* ── SIDEBAR ── */
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

/* ── THEME ── */
function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const next = isLight ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  document.getElementById("themeBtn").textContent = next === "light" ? "☀️" : "🌙";
  localStorage.setItem("cy_theme", next);
}

/* ── CHAT MANAGEMENT ── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function newChat() {
  activeId = uid();
  chats.unshift({ id: activeId, title: "New Chat", messages: [], pinned: false, ts: Date.now() });
  saveChats();
  renderChatList();
  clearMsgs();
  showWelcome();
  closeSidebar();
}

function loadChat(id) {
  activeId = id;
  const c = chats.find(c => c.id === id);
  if (!c) return;
  clearMsgs();
  hideWelcome();
  c.messages.forEach(m => {
    if (m.role === "user") renderUser(m.content, m.img || null, false);
    else renderAI(m.content, m.model || "groq", false);
  });
  renderChatList();
  closeSidebar();
  scrollEnd();
}

function delChat(id, e) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  if (activeId === id) { activeId = null; clearMsgs(); showWelcome(); }
  saveChats();
  renderChatList();
}
function pinChat(id, e) {
  e.stopPropagation();
  const c = chats.find(c => c.id === id);
  if (c) { c.pinned = !c.pinned; saveChats(); renderChatList(); }
}
function saveChats() { localStorage.setItem("cy_chats", JSON.stringify(chats)); }

function renderChatList() {
  const el = document.getElementById("chatList");
  const sorted = [...chats].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.ts - a.ts);
  el.innerHTML = sorted.map(c => `
    <div class="chat-item${c.id === activeId ? " active" : ""}" onclick="loadChat('${c.id}')">
      ${c.pinned ? '<span style="font-size:.75rem;flex-shrink:0">📌</span>' : ""}
      <span class="ci-text">${esc(c.title)}</span>
      <div class="ci-actions">
        <button class="ci-btn" onclick="pinChat('${c.id}',event)" title="${c.pinned ? "Unpin" : "Pin"}">${c.pinned ? "📍" : "📌"}</button>
        <button class="ci-btn" onclick="delChat('${c.id}',event)" title="Delete">🗑️</button>
      </div>
    </div>`).join("");
}

function updateStats() {
  const el = document.getElementById("sbStats");
  if (el) el.innerHTML = `💬 ${stats.msgs} msgs &nbsp;🎨 ${stats.imgs} images`;
}

/* ── WELCOME / CLEAR ── */
function hideWelcome() { document.getElementById("welcome").style.display = "none"; }
function showWelcome() {
  document.getElementById("welcome").style.display = "";
  document.getElementById("msgs").innerHTML = "";
  document.getElementById("wlcMsg").textContent = WELCOMES[Math.floor(Math.random() * WELCOMES.length)];
}
function clearMsgs() { document.getElementById("msgs").innerHTML = ""; }

/* ── RENDER USER ── */
function renderUser(text, imgData = null, scroll = true) {
  hideWelcome();
  const el = document.createElement("div");
  el.className = "msg user";
  el.innerHTML = `
    <div class="av">👤</div>
    <div class="msg-body">
      <div class="msg-meta">${now()}</div>
      ${imgData ? `<img src="${imgData}" class="msg-img" alt="uploaded"/>` : ""}
      <div class="bubble">${esc(text)}</div>
    </div>`;
  document.getElementById("msgs").appendChild(el);
  if (scroll) scrollEnd();
}

/* ── RENDER AI ── */
function renderAI(text, model = "groq", animate = true) {
  hideWelcome();
  const el = document.createElement("div");
  el.className = "msg ai";
  const labels = { groq: "⚡ Groq", "gemini-vision": "✨ Gemini Vision", gemini: "✨ Gemini", imagine: "🎨 Imagine", search: "🔍 Search" };
  const lbl = labels[model] || "🤖 AI";
  const bid = "b" + uid();

  el.innerHTML = `
    <div class="av">C</div>
    <div class="msg-body">
      <div class="msg-meta">Cymor AI · ${now()} <span class="mtag">${lbl}</span></div>
      <div class="bubble" id="${bid}">
        <button class="copy-top" onclick="copyBubble(this)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <div class="bubble-content"></div>
      </div>
      <div class="msg-actions">
        <button class="ma" onclick="likeMsg(this)" title="Like">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
        </button>
        <button class="ma" onclick="dislikeMsg(this)" title="Dislike">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
        </button>
        <button class="ma" onclick="speakBubble(this)" title="Read aloud">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        </button>
        <button class="ma" onclick="regenLast(this)" title="Regenerate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
        </button>
        <button class="ma" onclick="shareBubble(this)" title="Share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
        <button class="ma" onclick="summarize()" title="Summarize chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="10" y2="18"/></svg>
        </button>
      </div>
    </div>`;

  document.getElementById("msgs").appendChild(el);
  const content = el.querySelector(".bubble-content");

  if (animate) typewriter(content, text, () => addPreCopy(el.querySelector(".bubble")));
  else { content.innerHTML = md(text); addPreCopy(el.querySelector(".bubble")); }

  scrollEnd();
  return content;
}

/* ── RENDER IMAGE ── */
function renderImgMsg(dataUrl, prompt) {
  hideWelcome();
  const el = document.createElement("div");
  el.className = "msg ai";
  const dlUrl = dataUrl;
  el.innerHTML = `
    <div class="av">C</div>
    <div class="msg-body">
      <div class="msg-meta">Cymor AI · ${now()} <span class="mtag">🎨 Imagine</span></div>
      <div class="bubble">
        <button class="copy-top" onclick="copyBubble(this)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <div class="bubble-content">
          ✅ Generated: <em>"${esc(prompt)}"</em>
          <img src="${dataUrl}" class="gen-img" alt="generated image"/>
          <div class="gen-wm">🎨 Cymor AI · Cymor Tech Services</div>
        </div>
      </div>
      <div class="msg-actions">
        <button class="ma" onclick="likeMsg(this)" title="Like"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></button>
        <button class="ma" onclick="dislikeMsg(this)" title="Dislike"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg></button>
        <button class="ma" onclick="downloadImg('${dlUrl}')" title="Download">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="ma" onclick="shareBubble(this)" title="Share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
      </div>
    </div>`;
  document.getElementById("msgs").appendChild(el);
  scrollEnd();
}

/* ── TYPING INDICATOR ── */
function showTyping() {
  hideWelcome();
  const el = document.createElement("div");
  el.id = "typing"; el.className = "typing-row";
  el.innerHTML = `
    <div class="av" style="background:radial-gradient(circle at 38% 35%,#b09cff,#5b54d4);color:#fff;font-family:var(--fh);animation:glowCycle 5s ease-in-out infinite">C</div>
    <div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
  document.getElementById("msgs").appendChild(el);
  scrollEnd();
}
function hideTyping() { document.getElementById("typing")?.remove(); }

/* ── TYPEWRITER ── */
function typewriter(el, text, onDone) {
  const html = md(text);
  el.innerHTML = "";
  const chars = html.split("");
  let i = 0, inTag = false, buf = "";
  const iv = setInterval(() => {
    if (i >= chars.length) {
      clearInterval(iv);
      el.innerHTML = html;
      if (onDone) onDone();
      scrollEnd();
      return;
    }
    const ch = chars[i];
    if (ch === "<") inTag = true;
    if (inTag) buf += ch;
    else el.innerHTML += ch;
    if (ch === ">" && inTag) { inTag = false; el.innerHTML += buf; buf = ""; }
    i++;
    if (i % 12 === 0) scrollEnd();
  }, 11);
}

/* ── ADD PRE COPY BUTTONS ── */
function addPreCopy(bubble) {
  bubble.querySelectorAll("pre").forEach(pre => {
    if (pre.querySelector(".pre-copy")) return;
    const btn = document.createElement("button");
    btn.className = "pre-copy";
    btn.textContent = "Copy";
    btn.onclick = () => {
      navigator.clipboard.writeText(pre.querySelector("code")?.innerText || pre.innerText);
      btn.textContent = "✓ Copied!";
      setTimeout(() => btn.textContent = "Copy", 1800);
    };
    pre.appendChild(btn);
  });
}

/* ── MARKDOWN ── */
function md(text) {
  let h = esc(text);
  // Code blocks
  h = h.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang || ""}">${code.trim()}</code></pre>`);
  h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // Tables
  h = renderTables(h);
  // Headers
  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  h = h.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  h = h.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold/italic
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  // Blockquote
  h = h.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  // Lists
  h = h.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  h = h.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  h = h.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  // Links
  h = h.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Paragraphs
  h = h.replace(/\n\n/g, "</p><p>");
  h = h.replace(/\n/g, "<br/>");
  h = `<p>${h}</p>`;
  // Cleanup wrapping
  ["h1","h2","h3","pre","ul","ol","blockquote","table"].forEach(tag => {
    h = h.replace(new RegExp(`<p>(<${tag}[> ])`, "g"), "$1");
    h = h.replace(new RegExp(`(</${tag}>)<\/p>`, "g"), "$1");
  });
  h = h.replace(/<p><\/p>/g, "");
  return h;
}

function renderTables(h) {
  return h.replace(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)+)/g, match => {
    const lines = match.trim().split("\n");
    if (lines.length < 3) return match;
    const headers = lines[0].split("|").filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join("");
    const rows = lines.slice(2).map(l => {
      const cells = l.split("|").filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
}

/* ── SEND ── */
async function send() {
  const inp = document.getElementById("msgInput");
  const text = inp.value.trim();
  if (!text && !uploadedImg) return;

  inp.value = ""; resize(inp); hideStyleSelector();

  // Ensure active chat
  if (!activeId) {
    activeId = uid();
    chats.unshift({ id: activeId, title: text.slice(0, 40) || "Image Chat", messages: [], pinned: false, ts: Date.now() });
  } else {
    const c = chats.find(c => c.id === activeId);
    if (c && c.title === "New Chat") c.title = text.slice(0, 40);
  }

  const chat = chats.find(c => c.id === activeId);
  const imgSnap = uploadedImg, mimeSnap = uploadedMime;
  clearImg();
  renderUser(text, imgSnap);
  chat.messages.push({ role: "user", content: text, img: imgSnap });
  showTyping(); saveChats(); renderChatList();

  // Track & trigger prompts
  stats.msgs++; sessionMsgs++;
  localStorage.setItem("cy_stats", JSON.stringify(stats));
  updateStats();
  if (sessionMsgs === 5 && !installShown) { installShown = true; setTimeout(showInstallBanner, 1500); }
  if (sessionMsgs === 10 && !ratingShown) { ratingShown = true; setTimeout(showRatingModal, 1000); }

  try {
    let reply, usedModel;

    // ── SEARCH ──
    if (/^(search:|\/search\s)/i.test(text)) {
      const query = text.replace(/^(search:|\/search\s*)/i, "").trim();
      const r = await fetch(`${BACKEND}/api/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const d = await r.json();
      hideTyping();
      reply = d.reply || d.error; usedModel = "search";
    }
    // ── /IMAGINE ──
    else if (/^\/imagine\s/i.test(text)) {
      const prompt = text.replace(/^\/imagine\s*/i, "").trim();
      const style = document.getElementById("imgStyle").value;
      // Keep typing while generating (can take 30-60s)
      const r = await fetch(`${BACKEND}/api/imagine`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style })
      });
      const d = await r.json();
      hideTyping();
      if (d.error) {
        renderAI(`⚠️ Image generation: ${d.error}`, "imagine");
      } else {
        renderImgMsg(d.image, prompt);
        stats.imgs++;
        localStorage.setItem("cy_stats", JSON.stringify(stats));
        updateStats();
      }
      saveChats(); return;
    }
    // ── VISION ──
    else if (imgSnap) {
      const r = await fetch(`${BACKEND}/api/vision`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgSnap.split(",")[1], mimeType: mimeSnap, prompt: text || "Analyze this image in detail" })
      });
      const d = await r.json();
      hideTyping();
      reply = d.reply || d.error; usedModel = "gemini-vision";
    }
    // ── CHAT ──
    else {
      const history = chat.messages.slice(-14).map(m => ({ role: m.role, content: m.content }));
      const r = await fetch(`${BACKEND}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });
      const d = await r.json();
      hideTyping();
      reply = d.reply || d.error; usedModel = d.model || "groq";
    }

    renderAI(reply, usedModel, true);
    chat.messages.push({ role: "assistant", content: reply, model: usedModel });
    saveChats();

  } catch (err) {
    hideTyping();
    renderAI(`⚠️ Connection error: ${err.message}\n\nMake sure your backend URL is set correctly in app.js 🛠️`, "groq");
  }
}

function chip(t) { document.getElementById("msgInput").value = t; checkImagine(t); send(); }

/* ── KEY HANDLER: Enter = newline, Ctrl+Enter = send ── */
function onKey(e) {
  if (e.key === "Enter") {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Enter or Cmd+Enter → SEND
      e.preventDefault();
      send();
    }
    // Plain Enter → newline (default textarea behaviour, just let it happen)
    // We do NOT preventDefault here — textarea naturally inserts \n
  }
}

function resize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 150) + "px";
}

function checkImagine(v) {
  document.getElementById("styleRow").classList.toggle("hidden", !/^\/imagine\s/i.test(v));
}
function hideStyleSelector() { document.getElementById("styleRow").classList.add("hidden"); }

/* ── IMAGE UPLOAD ── */
function onImgUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  uploadedMime = file.type;
  const reader = new FileReader();
  reader.onload = ev => {
    uploadedImg = ev.target.result;
    document.getElementById("prevImg").src = uploadedImg;
    document.getElementById("imgPreview").classList.remove("hidden");
    document.getElementById("modelBadge").textContent = "✨ Gemini Vision";
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}
function clearImg() {
  uploadedImg = null; uploadedMime = null;
  document.getElementById("imgPreview").classList.add("hidden");
  document.getElementById("prevImg").src = "";
  document.getElementById("modelBadge").textContent = "⚡ Groq";
}

/* ── VOICE ── */
function toggleVoice() {
  if (!recognition) { showToast("🎙️ Voice not supported in this browser"); return; }
  if (isListening) { recognition.stop(); }
  else { recognition.start(); isListening = true; document.getElementById("voiceBtn").classList.add("listening"); showToast("🎙️ Listening... speak now"); }
}

/* ── MSG ACTIONS ── */
function copyBubble(btn) {
  const content = btn.closest(".bubble").querySelector(".bubble-content");
  navigator.clipboard.writeText(content?.innerText || "").then(() => showToast("📋 Copied!"));
}

function speakBubble(btn) {
  if (!window.speechSynthesis) { showToast("TTS not supported"); return; }
  const text = btn.closest(".msg-body").querySelector(".bubble-content")?.innerText || "";
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text.slice(0, 800));
  utt.rate = 1.0;
  window.speechSynthesis.speak(utt);
  showToast("🔊 Speaking...");
}

function likeMsg(btn) {
  const wasLiked = btn.classList.contains("liked");
  btn.classList.toggle("liked", !wasLiked);
  btn.closest(".msg-actions").querySelector(".ma.disliked")?.classList.remove("disliked");
  showToast(wasLiked ? "Feedback removed" : "👍 Thanks for the feedback!");
}
function dislikeMsg(btn) {
  const wasDis = btn.classList.contains("disliked");
  btn.classList.toggle("disliked", !wasDis);
  btn.closest(".msg-actions").querySelector(".ma.liked")?.classList.remove("liked");
  showToast(wasDis ? "Feedback removed" : "👎 Thanks! We'll improve.");
}

function shareBubble(btn) {
  const content = btn.closest(".msg-body").querySelector(".bubble-content")?.innerText || "";
  const full = content + "\n\n— Cymor AI by Legendary Smiley Cymor\nhttps://cymorai09.netlify.app";
  if (navigator.share) {
    navigator.share({ title: "Cymor AI", text: full }).catch(() => {
      navigator.clipboard.writeText(full).then(() => showToast("📤 Copied to clipboard!"));
    });
  } else {
    navigator.clipboard.writeText(full).then(() => showToast("📤 Copied to clipboard!"));
  }
}

function downloadImg(url) {
  const a = document.createElement("a"); a.href = url;
  a.download = `cymor-ai-${Date.now()}.jpg`; a.click();
}

async function regenLast(btn) {
  const chat = chats.find(c => c.id === activeId); if (!chat || chat.messages.length < 2) return;
  const li = [...chat.messages].reverse().findIndex(m => m.role === "assistant");
  if (li < 0) return;
  const idx = chat.messages.length - 1 - li;
  chat.messages.splice(idx, 1);
  btn.closest(".msg")?.remove();
  const history = chat.messages.slice(-14).map(m => ({ role: m.role, content: m.content }));
  showTyping();
  try {
    const r = await fetch(`${BACKEND}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
    const d = await r.json(); hideTyping();
    renderAI(d.reply, d.model || "groq");
    chat.messages.push({ role: "assistant", content: d.reply, model: d.model || "groq" }); saveChats();
  } catch (e) { hideTyping(); renderAI("⚠️ Regeneration failed. Please try again.", "groq"); }
}

async function summarize() {
  const chat = chats.find(c => c.id === activeId);
  if (!chat || chat.messages.length < 3) { showToast("Need more messages to summarize"); return; }
  const transcript = chat.messages.map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");
  showTyping();
  try {
    const r = await fetch(`${BACKEND}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: `Summarize this conversation in 4 concise bullet points:\n\n${transcript}` }] }) });
    const d = await r.json(); hideTyping();
    renderAI("📝 **Chat Summary**\n\n" + d.reply, "groq");
  } catch (e) { hideTyping(); showToast("Summary failed"); }
}

/* ── INSTALL ── */
function showInstallBanner() { document.getElementById("installBanner").classList.add("show"); }
function dismissInstall() { document.getElementById("installBanner").classList.remove("show"); }
function installApp() {
  if (installEvt) { installEvt.prompt(); installEvt.userChoice.then(() => dismissInstall()); }
  else { showToast("Tap browser menu → 'Add to Home Screen' 📱"); dismissInstall(); }
}

/* ── RATING MODAL ── */
function showRatingModal() {
  const ov = document.createElement("div"); ov.className = "modal-ov";
  ov.innerHTML = `
    <div class="modal">
      <h3>How's Cymor AI? 🌟</h3>
      <p>Your rating helps us improve the experience for everyone!</p>
      <div class="stars">${[1,2,3,4,5].map(n => `<span class="star" data-n="${n}" onclick="rate(${n},this)">★</span>`).join("")}</div>
      <div class="modal-btns">
        <button class="mbtn secondary" onclick="this.closest('.modal-ov').remove()">Skip</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}
function rate(n, el) {
  const stars = [...el.parentElement.querySelectorAll(".star")];
  stars.forEach((s, i) => s.classList.toggle("on", i < n));
  setTimeout(() => {
    el.closest(".modal-ov").remove();
    showToast(n >= 4 ? "🙏 Thank you! So glad you love it!" : "💪 Thanks! We'll keep improving!");
  }, 700);
}

/* ── UTILS ── */
function scrollEnd() { const w = document.getElementById("chatWrap"); requestAnimationFrame(() => w.scrollTop = w.scrollHeight); }
function now() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function esc(t) { return (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function showToast(m) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = m; t.classList.add("show");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);
}
