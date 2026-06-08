/* ============================================
   CYMOR AI — app.js
   Full frontend logic
============================================ */

// ===== CONFIG =====
const BACKEND = "https://cymorai.onrender.com"; // Change to your Render URL

const WELCOME_MESSAGES = [
  "How may I help you today? 😊",
  "What can I create for you? ✨",
  "Ready to think big together! 🚀",
  "Ask me anything — I'm all ears 👂",
  "What's on your mind today? 💭",
  "Let's build something great! 🛠️",
  "Your intelligent assistant is ready 🤖",
  "Habari! Nikusaidie nini leo? 🇰🇪",
  "What problem shall we solve today? 🧩",
  "I'm powered and ready for you! ⚡"
];

// ===== STATE =====
let chats = JSON.parse(localStorage.getItem("cymor_chats") || "[]");
let activeChatId = null;
let currentModel = "groq";
let ttsEnabled = false;
let isListening = false;
let recognition = null;
let uploadedImage = null;
let uploadedMimeType = null;
let stats = JSON.parse(localStorage.getItem("cymor_stats") || '{"messages":0,"images":0}');

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  // Splash → app
  setTimeout(() => {
    document.getElementById("splash").style.display = "none";
    renderChatList();
    showWelcome();
    updateStats();
  }, 3200);

  // Voice setup
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      document.getElementById("msgInput").value = transcript;
      autoResize(document.getElementById("msgInput"));
      checkImagine(transcript);
    };
    recognition.onend = () => {
      isListening = false;
      document.getElementById("voiceBtn").classList.remove("listening");
    };
  }

  // Register SW
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});

// ===== WELCOME =====
function showWelcome() {
  const msg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
  document.getElementById("welcomeMsg").textContent = msg;
}

// ===== SIDEBAR =====
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("overlay").classList.toggle("show");
}

// ===== THEME =====
function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  document.documentElement.setAttribute("data-theme", isLight ? "dark" : "light");
  document.getElementById("themeBtn").textContent = isLight ? "🌙" : "☀️";
  localStorage.setItem("cymor_theme", isLight ? "dark" : "light");
}
// Load saved theme
const savedTheme = localStorage.getItem("cymor_theme");
if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

// ===== MODEL =====
function selectModel(btn, model) {
  document.querySelectorAll(".model-opt").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentModel = model;
  const labels = { groq: "⚡ Groq", claude: "🧠 Claude", gemini: "✨ Gemini" };
  document.getElementById("modelBadge").textContent = labels[model];
}

// ===== CHAT MANAGEMENT =====
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function startNewChat() {
  activeChatId = generateId();
  const chat = { id: activeChatId, title: "New Chat", messages: [], pinned: false, createdAt: Date.now() };
  chats.unshift(chat);
  saveChats();
  renderChatList();
  clearMessages();
  showWelcome();
  if (window.innerWidth < 768) toggleSidebar();
}

function loadChat(id) {
  activeChatId = id;
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  clearMessages();
  hideWelcome();
  chat.messages.forEach(m => {
    if (m.role === "user") renderUserMsg(m.content, m.image || null);
    else renderAIMsg(m.content, m.model || "groq", false);
  });
  renderChatList();
  if (window.innerWidth < 768) toggleSidebar();
  scrollBottom();
}

function deleteChat(id, e) {
  e.stopPropagation();
  chats = chats.filter(c => c.id !== id);
  saveChats();
  if (activeChatId === id) {
    activeChatId = null;
    clearMessages();
    showWelcome();
  }
  renderChatList();
}

function pinChat(id, e) {
  e.stopPropagation();
  const chat = chats.find(c => c.id === id);
  if (chat) { chat.pinned = !chat.pinned; saveChats(); renderChatList(); }
}

function saveChats() { localStorage.setItem("cymor_chats", JSON.stringify(chats)); }

function renderChatList() {
  const list = document.getElementById("chatList");
  const sorted = [...chats].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
  list.innerHTML = sorted.map(c => `
    <div class="chat-item ${c.id === activeChatId ? "active" : ""}" onclick="loadChat('${c.id}')">
      ${c.pinned ? '<span class="chat-item-pin">📌</span>' : ''}
      <span class="chat-item-text">${escapeHtml(c.title)}</span>
      <div class="chat-actions">
        <button class="chat-action-btn" onclick="pinChat('${c.id}',event)" title="${c.pinned ? 'Unpin' : 'Pin'}">
          ${c.pinned ? '📍' : '📌'}
        </button>
        <button class="chat-action-btn" onclick="deleteChat('${c.id}',event)" title="Delete">🗑️</button>
      </div>
    </div>
  `).join("");
}

function updateStats() {
  const s = document.getElementById("footerStats");
  if (s) s.innerHTML = `💬 ${stats.messages} msgs &nbsp; 🎨 ${stats.images} images`;
}

// ===== MESSAGE RENDERING =====
function hideWelcome() {
  const ws = document.getElementById("welcomeScreen");
  if (ws) ws.style.display = "none";
}

function clearMessages() {
  document.getElementById("messages").innerHTML = "";
  const ws = document.getElementById("welcomeScreen");
  if (ws) ws.style.display = "";
}

function renderUserMsg(text, imageData = null) {
  hideWelcome();
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg user";
  div.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-body">
      <div class="msg-meta">${timeNow()}</div>
      ${imageData ? `<img src="${imageData}" class="msg-img" alt="uploaded"/>` : ""}
      <div class="msg-bubble">${escapeHtml(text)}</div>
    </div>
  `;
  msgs.appendChild(div);
  scrollBottom();
}

function renderAIMsg(text, model = "groq", animate = true) {
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg ai";
  const modelLabels = { groq: "⚡ Groq", claude: "🧠 Claude", "gemini-vision": "✨ Gemini Vision", gemini: "✨ Gemini", imagine: "🎨 Imagine" };
  const label = modelLabels[model] || "🤖 AI";

  div.innerHTML = `
    <div class="msg-avatar">C</div>
    <div class="msg-body">
      <div class="msg-meta">
        Cymor AI · ${timeNow()}
        <span class="msg-model-tag">${label}</span>
      </div>
      <div class="msg-bubble" id="bubble-${Date.now()}">${animate ? "" : renderMarkdown(text)}</div>
      <div class="msg-actions">
        <button class="msg-action" onclick="copyMsg(this)">📋 Copy</button>
        <button class="msg-action" onclick="regenMsg(this)">🔁 Regenerate</button>
        <button class="msg-action" onclick="speakMsg(this)">🔊 Speak</button>
        <button class="msg-action" onclick="shareMsg(this)">📤 Share</button>
        <button class="msg-action" onclick="summarizeChat()">📝 Summarize</button>
      </div>
    </div>
  `;
  msgs.appendChild(div);

  const bubble = div.querySelector(".msg-bubble");

  if (animate) {
    typewriterEffect(bubble, text);
  } else {
    bubble.innerHTML = renderMarkdown(text);
  }

  if (ttsEnabled) speakText(text);
  scrollBottom();
  return bubble;
}

function renderImageMsg(imageDataUrl, prompt) {
  hideWelcome();
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "msg ai";
  div.innerHTML = `
    <div class="msg-avatar">C</div>
    <div class="msg-body">
      <div class="msg-meta">Cymor AI · ${timeNow()} <span class="msg-model-tag">🎨 Imagine</span></div>
      <div class="msg-bubble">
        ✅ Here's your generated image for: <em>"${escapeHtml(prompt)}"</em>
        <br/><br/>
        <img src="${imageDataUrl}" class="gen-image" alt="Generated image"/>
        <div class="gen-image-watermark">🎨 Built with Cymor AI · Cymor Tech Services</div>
        <br/>🤔 Would you like to try a different style or refine this prompt?
      </div>
      <div class="msg-actions">
        <button class="msg-action" onclick="downloadImage('${imageDataUrl}')">⬇️ Download</button>
        <button class="msg-action" onclick="shareMsg(this)">📤 Share</button>
      </div>
    </div>
  `;
  msgs.appendChild(div);
  scrollBottom();
}

function showTyping() {
  hideWelcome();
  const msgs = document.getElementById("messages");
  const div = document.createElement("div");
  div.id = "typing";
  div.className = "typing-indicator";
  div.innerHTML = `
    <div class="msg-avatar" style="background:radial-gradient(circle at 35% 35%,var(--accent3),var(--accent2));color:#fff;font-family:var(--font-head);width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 0 12px var(--glow2)">C</div>
    <div class="typing-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  `;
  msgs.appendChild(div);
  scrollBottom();
}

function hideTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

// ===== TYPEWRITER =====
function typewriterEffect(el, text) {
  const html = renderMarkdown(text);
  el.innerHTML = "";
  let i = 0;
  const chars = html.split("");
  let inTag = false;
  let buffer = "";
  const interval = setInterval(() => {
    if (i >= chars.length) { clearInterval(interval); el.innerHTML = html; scrollBottom(); return; }
    const ch = chars[i];
    if (ch === "<") inTag = true;
    if (inTag) buffer += ch;
    else el.innerHTML += ch;
    if (ch === ">" && inTag) { inTag = false; el.innerHTML += buffer; buffer = ""; }
    i++;
    if (i % 8 === 0) scrollBottom();
  }, 12);
}

// ===== MARKDOWN RENDERER =====
function renderMarkdown(text) {
  let html = escapeHtml(text);
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang||''}">${code.trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold/italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  // Tables
  html = renderTables(html);
  // Lists
  html = html.replace(/^\- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br/>");
  html = `<p>${html}</p>`;
  // Clean up empty p
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>(<h[123]>)/g, "$1");
  html = html.replace(/(<\/h[123]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<pre>)/g, "$1");
  html = html.replace(/(<\/pre>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote>)/g, "$1");
  html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");
  html = html.replace(/<p>(<table)/g, "$1");
  html = html.replace(/(<\/table>)<\/p>/g, "$1");
  return html;
}

function renderTables(html) {
  // Match markdown table blocks
  const tableRegex = /(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)+)/g;
  return html.replace(tableRegex, (match) => {
    const lines = match.trim().split("\n");
    if (lines.length < 3) return match;
    const headers = lines[0].split("|").filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join("");
    const rows = lines.slice(2).map(line => {
      const cells = line.split("|").filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
}

// ===== SEND MESSAGE =====
async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text && !uploadedImage) return;

  // Ensure we have an active chat
  if (!activeChatId) {
    activeChatId = generateId();
    const chat = { id: activeChatId, title: text.slice(0, 40) || "Image Chat", messages: [], pinned: false, createdAt: Date.now() };
    chats.unshift(chat);
  } else {
    // Update title from first message
    const chat = chats.find(c => c.id === activeChatId);
    if (chat && chat.title === "New Chat") chat.title = text.slice(0, 40);
  }

  input.value = "";
  autoResize(input);
  hideStyleSelector();

  const chat = chats.find(c => c.id === activeChatId);
  const imageSnapshot = uploadedImage;
  const mimeSnapshot = uploadedMimeType;

  // Render user message
  renderUserMsg(text, imageSnapshot);
  chat.messages.push({ role: "user", content: text, image: imageSnapshot });

  // Clear image
  clearImage();
  showTyping();
  saveChats();
  renderChatList();

  // Stats
  stats.messages++;
  localStorage.setItem("cymor_stats", JSON.stringify(stats));
  updateStats();

  try {
    let reply, usedModel;

    // /imagine command
    if (text.toLowerCase().startsWith("/imagine")) {
      const prompt = text.slice(8).trim();
      const style = document.getElementById("imgStyle").value;
      hideTyping();
      showTyping();
      const res = await fetch(`${BACKEND}/api/imagine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style })
      });
      const data = await res.json();
      hideTyping();
      if (data.error) {
        renderAIMsg(`⚠️ Image generation failed: ${data.error}\n\nTip: The model might be warming up. Try again in 30 seconds! ⏳`, "imagine");
      } else {
        renderImageMsg(data.image, prompt);
        stats.images++;
        localStorage.setItem("cymor_stats", JSON.stringify(stats));
        updateStats();
      }
      saveChats();
      return;
    }

    // Image uploaded → use Gemini Vision
    if (imageSnapshot) {
      const res = await fetch(`${BACKEND}/api/vision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageSnapshot.split(",")[1], mimeType: mimeSnapshot, prompt: text || "Analyze this image" })
      });
      const data = await res.json();
      hideTyping();
      reply = data.reply || data.error;
      usedModel = "gemini-vision";
    } else {
      // Build message history
      const history = chat.messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`${BACKEND}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, model: currentModel })
      });
      const data = await res.json();
      hideTyping();
      reply = data.reply || data.error;
      usedModel = data.model || currentModel;
    }

    renderAIMsg(reply, usedModel, true);
    chat.messages.push({ role: "assistant", content: reply, model: usedModel });
    saveChats();

  } catch (err) {
    hideTyping();
    renderAIMsg(`⚠️ Connection error: ${err.message}\n\nMake sure the backend is running and the URL is set correctly in app.js 🛠️`, "groq");
  }
}

function sendChip(text) {
  document.getElementById("msgInput").value = text;
  checkImagine(text);
  sendMessage();
}

// ===== KEYBOARD =====
function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

// ===== IMAGINE DETECTION =====
function checkImagine(val) {
  const ss = document.getElementById("styleSelector");
  if (val.toLowerCase().startsWith("/imagine")) ss.classList.remove("hidden");
  else ss.classList.add("hidden");
}
function hideStyleSelector() { document.getElementById("styleSelector").classList.add("hidden"); }

// ===== IMAGE UPLOAD =====
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  uploadedMimeType = file.type;
  const reader = new FileReader();
  reader.onload = (ev) => {
    uploadedImage = ev.target.result;
    document.getElementById("previewImg").src = uploadedImage;
    document.getElementById("imagePreview").classList.remove("hidden");
    // Auto-switch to gemini model
    document.querySelectorAll(".model-opt").forEach(b => b.classList.remove("active"));
    document.querySelector('[data-model="gemini"]').classList.add("active");
    currentModel = "gemini";
    document.getElementById("modelBadge").textContent = "✨ Gemini";
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

function clearImage() {
  uploadedImage = null; uploadedMimeType = null;
  document.getElementById("imagePreview").classList.add("hidden");
  document.getElementById("previewImg").src = "";
}

// ===== VOICE =====
function toggleVoice() {
  if (!recognition) { showToast("🎙️ Voice not supported in this browser"); return; }
  if (isListening) {
    recognition.stop(); isListening = false;
    document.getElementById("voiceBtn").classList.remove("listening");
  } else {
    recognition.start(); isListening = true;
    document.getElementById("voiceBtn").classList.add("listening");
    showToast("🎙️ Listening...");
  }
}

// ===== TTS =====
function toggleTTS() {
  ttsEnabled = !ttsEnabled;
  document.getElementById("ttsFab").classList.toggle("active", ttsEnabled);
  showToast(ttsEnabled ? "🔊 Text-to-speech ON" : "🔇 Text-to-speech OFF");
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[#*`>\-|]/g, "").replace(/\n+/g, " ").slice(0, 500);
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 1.0; utt.pitch = 1.0;
  window.speechSynthesis.speak(utt);
}

function speakMsg(btn) {
  const bubble = btn.closest(".msg-body").querySelector(".msg-bubble");
  speakText(bubble.innerText);
  showToast("🔊 Speaking...");
}

// ===== MESSAGE ACTIONS =====
function copyMsg(btn) {
  const bubble = btn.closest(".msg-body").querySelector(".msg-bubble");
  navigator.clipboard.writeText(bubble.innerText).then(() => showToast("📋 Copied!"));
}

function shareMsg(btn) {
  const bubble = btn.closest(".msg-body").querySelector(".msg-bubble");
  const text = bubble.innerText;
  if (navigator.share) {
    navigator.share({ title: "Cymor AI Response", text: text.slice(0, 300) + "...\n\n— Cymor AI by Legendary Smiley Cymor" });
  } else {
    navigator.clipboard.writeText(text).then(() => showToast("📤 Copied to clipboard!"));
  }
}

async function regenMsg(btn) {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat || chat.messages.length < 2) return;
  // Remove last AI message
  const lastAI = chat.messages.findLastIndex(m => m.role === "assistant");
  if (lastAI < 0) return;
  chat.messages.splice(lastAI, 1);
  // Remove from DOM
  const msgs = document.getElementById("messages");
  const msgEls = msgs.querySelectorAll(".msg.ai");
  if (msgEls.length > 0) msgEls[msgEls.length - 1].remove();
  // Resend
  const history = chat.messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
  showTyping();
  try {
    const res = await fetch(`${BACKEND}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, model: currentModel })
    });
    const data = await res.json();
    hideTyping();
    renderAIMsg(data.reply, data.model || currentModel);
    chat.messages.push({ role: "assistant", content: data.reply, model: data.model || currentModel });
    saveChats();
  } catch (err) {
    hideTyping();
    renderAIMsg("⚠️ Regeneration failed. Try again!", "groq");
  }
}

async function summarizeChat() {
  const chat = chats.find(c => c.id === activeChatId);
  if (!chat || chat.messages.length < 2) { showToast("Not enough messages to summarize"); return; }
  const transcript = chat.messages.map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");
  showTyping();
  try {
    const res = await fetch(`${BACKEND}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: `Please summarize this conversation in 3-5 bullet points:\n\n${transcript}` }],
        model: "groq"
      })
    });
    const data = await res.json();
    hideTyping();
    renderAIMsg("📝 **Chat Summary:**\n\n" + data.reply, "groq");
  } catch (err) {
    hideTyping();
    showToast("Summary failed");
  }
}

function downloadImage(dataUrl) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `cymor-ai-image-${Date.now()}.jpg`;
  a.click();
}

// ===== UTILS =====
function scrollBottom() {
  const ca = document.getElementById("chatArea");
  ca.scrollTop = ca.scrollHeight;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showToast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}
