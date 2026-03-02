// ─────────────────────────────────────────────
//  Gemini Chatbot — script.js
//  API key is entered by the user and stored
//  in their own browser (localStorage).
//  It is NEVER hard-coded or sent to any server.
// ─────────────────────────────────────────────

const setupScreen  = document.getElementById("setupScreen");
const chatWrapper  = document.getElementById("chatWrapper");
const apiKeyInput  = document.getElementById("apiKeyInput");
const apiError     = document.getElementById("apiError");
const startBtn     = document.getElementById("startBtn");
const chatMessages = document.getElementById("chatMessages");
const userInput    = document.getElementById("userInput");
const sendBtn      = document.getElementById("sendBtn");
const statusEl     = document.getElementById("status");
const clearBtn     = document.getElementById("clearBtn");
const changeKeyBtn = document.getElementById("changeKeyBtn");

let API_KEY = "";
let history = [];

// ── On load: check for saved key ──────────────
window.addEventListener("load", () => {
  const saved = localStorage.getItem("gemini_api_key");
  if (saved) {
    API_KEY = saved;
    showChat();
  }
});

// ── Start button ──────────────────────────────
startBtn.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) { showError("Please paste your API key first."); return; }

  startBtn.textContent = "Checking key...";
  startBtn.disabled = true;

  const valid = await validateKey(key);
  if (valid) {
    API_KEY = key;
    localStorage.setItem("gemini_api_key", key);
    showChat();
  } else {
    showError("Invalid API key. Please check and try again.");
    startBtn.textContent = "Start Chatting →";
    startBtn.disabled = false;
  }
});

// ── Validate key with a tiny test request ─────
async function validateKey(key) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] })
      }
    );
    return res.ok;
  } catch { return false; }
}

function showError(msg) { apiError.textContent = msg; }

function showChat() {
  setupScreen.style.display = "none";
  chatWrapper.style.display = "flex";
  userInput.focus();
}

// ── Change key button ─────────────────────────
changeKeyBtn.addEventListener("click", () => {
  localStorage.removeItem("gemini_api_key");
  history = [];
  chatWrapper.style.display = "none";
  setupScreen.style.display = "flex";
  apiKeyInput.value = "";
  apiError.textContent = "";
  startBtn.textContent = "Start Chatting →";
  startBtn.disabled = false;
});

// ── Clear chat ────────────────────────────────
clearBtn.addEventListener("click", () => {
  history = [];
  chatMessages.innerHTML = `
    <div class="message bot-message">
      <div class="bubble">Chat cleared! Start a new conversation 🧹</div>
    </div>`;
});

// ── Auto-resize textarea ──────────────────────
userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
});

// ── Enter to send ─────────────────────────────
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

// ── Core send function ────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  history.push({ role: "user", parts: [{ text }] });

  userInput.value = "";
  userInput.style.height = "auto";
  setLoading(true);
  addTypingIndicator();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: history })
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "API error");
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

    removeTypingIndicator();
    addMessage(reply, "bot");
    history.push({ role: "model", parts: [{ text: reply }] });

  } catch (err) {
    removeTypingIndicator();
    const bubble = addMessage(`⚠️ Error: ${err.message}`, "bot");
    bubble.classList.add("error-bubble");
  }

  setLoading(false);
  userInput.focus();
}

// ── UI helpers ────────────────────────────────
function addMessage(text, role) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${role === "user" ? "user-message" : "bot-message"}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  msgDiv.appendChild(bubble);
  chatMessages.appendChild(msgDiv);
  scrollToBottom();
  return bubble;
}

function addTypingIndicator() {
  const msgDiv = document.createElement("div");
  msgDiv.className = "message bot-message";
  msgDiv.id = "typingIndicator";
  const bubble = document.createElement("div");
  bubble.className = "bubble typing-indicator";
  bubble.innerHTML = "<span></span><span></span><span></span>";
  msgDiv.appendChild(bubble);
  chatMessages.appendChild(msgDiv);
  scrollToBottom();
}

function removeTypingIndicator() {
  document.getElementById("typingIndicator")?.remove();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setLoading(on) {
  sendBtn.disabled = on;
  userInput.disabled = on;
  statusEl.textContent = on ? "Typing..." : "Ready";
  statusEl.className = on ? "status typing" : "status";
}
