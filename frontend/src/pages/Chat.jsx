import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendMessage } from "../api/chat.js";
import { Key, House, LayoutDashboard } from 'lucide-react';

const SUGGESTIONS = [
  "Action movies with Zendaya",
  "Tell me about Movie 0315",
  "Movies similar to Inception",
  "Who directed Movie 0001?",
  "How is Zendaya related to James Cameron?",
  "Recommend thriller movies",
];

const FREE_LIMIT = 1; // searches allowed without API key
const STORAGE_KEY = "movieverse_api_key";
const SEARCHES_KEY = "movieverse_free_searches";

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // API key state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [freeSearches, setFreeSearches] = useState(() => parseInt(localStorage.getItem(SEARCHES_KEY) || "0"));
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keySuccess, setKeySuccess] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const hasKey = apiKey.length > 10;
  const canSearchFree = freeSearches < FREE_LIMIT;
  const canSearch = hasKey || canSearchFree;

  useEffect(() => {
    const q = location.state?.initialQuery;
    if (q) { submitQuery(q); window.history.replaceState({}, ""); }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function saveApiKey(key) {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setKeySuccess(true);
    setTimeout(() => { setShowKeyModal(false); setKeySuccess(false); setKeyInput(""); setKeyError(""); }, 1200);
  }

  function removeApiKey() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SEARCHES_KEY);
    setApiKey("");
    setFreeSearches(0);
  }

  function incrementFreeSearches() {
    const next = freeSearches + 1;
    setFreeSearches(next);
    localStorage.setItem(SEARCHES_KEY, String(next));
  }

  async function submitQuery(query) {
    if (!query.trim() || loading) return;

    // Block if no key and no free searches left
    if (!hasKey && !canSearchFree) {
      setShowKeyModal(true);
      return;
    }

    const q = query.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    // Track free usage
    if (!hasKey) incrementFreeSearches();

    try {
      const data = await sendMessage(q, hasKey ? apiKey : null);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: data.answer,
        type: data.classification?.type,
      }]);

      // After free search used up, show key prompt after response
      if (!hasKey && freeSearches + 1 >= FREE_LIMIT) {
        setTimeout(() => setShowKeyModal(true), 800);
      }

    } catch (err) {
      const isKeyErr = err.message?.includes("Invalid API key");
      if (isKeyErr) { removeApiKey(); }
      setMessages(prev => [...prev, { role: "error", text: err.message }]);
      if (isKeyErr) setTimeout(() => setShowKeyModal(true), 500);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitQuery(input); }
  }

  async function handleSaveKey() {
    setKeyError("");
    const k = keyInput.trim();

    // Accept both old AIza format and new AQ. format
    const isOldFormat = k.startsWith("AIza") && k.length >= 35;
    const isNewFormat = k.startsWith("AQ.") && k.length >= 20;

    if (!isOldFormat && !isNewFormat) {
      setKeyError("Invalid key. Get your key from aistudio.google.com");
      return;
    }

    saveApiKey(k);
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={s.page}>
      {/* API Key Modal */}
      {showKeyModal && (
        <div style={s.modalOverlay} onClick={() => setShowKeyModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setShowKeyModal(false)}>✕</button>

            <div style={s.modalIcon}><Key size={32} color="#e8c547" /></div>
            <h2 style={s.modalTitle}>Add Your Gemini API Key</h2>
            <p style={s.modalDesc}>
              {canSearchFree
                ? "You've used your free search. Add your Gemini API key for unlimited searches."
                : "Add your free Gemini API key to continue searching."}
            </p>

            <div style={s.modalSteps}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={s.modalLink}
              >
                → Get your free API key at aistudio.google.com ↗
              </a>
            </div>

            <input
              style={{ ...s.keyInput, borderColor: keyError ? "#ff6b6b" : keySuccess ? "#4ade80" : "rgba(255,255,255,0.1)" }}
              type="password"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setKeyError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSaveKey()}
              autoFocus
            />
            {keyError && <p style={s.keyError}>{keyError}</p>}
            {keySuccess && <p style={s.keySuccess}>✓ Key saved! Unlocking unlimited searches...</p>}

            <button style={s.saveKeyBtn} onClick={handleSaveKey}>
              Save & Continue
            </button>

            <p style={s.keyNote}>
              Your key is stored only in your browser's localStorage. It is never sent to our servers except to forward your Gemini request.
            </p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <span style={s.logo} onClick={() => navigate("/")}>
            MV<span style={s.acc}>AI</span>
          </span>
          <button style={s.newChat} onClick={() => setMessages([])}>+ New</button>
        </div>

        {/* Key status */}
        <div style={s.keyStatus}>
          {hasKey ? (
            <div style={s.keyActive}>
              <span style={s.keyDot} />
              <span style={s.keyLabel}>Your API key active</span>
              <button style={s.removeKey} onClick={removeApiKey} title="Remove key">✕</button>
            </div>
          ) : (
            <div style={s.keyInactive} onClick={() => setShowKeyModal(true)}>
              <span style={s.keyInactiveContent}><Key size={14} /> Add API key</span>
              {canSearchFree && (
                <span style={s.freeCount}>{FREE_LIMIT - freeSearches} free left</span>
              )}
              {!canSearchFree && (
                <span style={s.freeOut}>Limit reached</span>
              )}
            </div>
          )}
        </div>

        <div style={s.sideLabel}>QUICK QUERIES</div>
        <div style={s.sideLinks}>
          {SUGGESTIONS.map(q => (
            <div key={q} style={s.sideLink} onClick={() => submitQuery(q)}>{q}</div>
          ))}
        </div>

        <div style={s.sideBottom}>
          <div style={s.sideNav} onClick={() => navigate("/dashboard")}><LayoutDashboard size={16} />Dashboard</div>
          <div style={s.sideNav} onClick={() => navigate("/")}><House size={16} />Home</div>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        <header style={s.header}>
          <span style={s.headerTitle}>Movie Assistant</span>
          <div style={s.headerRight}>
            <div style={s.headerBadges}>
              <span style={s.badge}>Neo4j</span>
              <span style={s.badge}>Pinecone</span>
              <span style={s.badge}>Gemini</span>
            </div>
            {!hasKey && (
              <button style={s.addKeyBtn} onClick={() => setShowKeyModal(true)}>
                    <Key size={14} />Add API Key
              </button>
            )}
          </div>
        </header>

        <div style={s.messages}>
          {isEmpty && (
            <div style={s.emptyState}>
              <div style={s.emptyTitle}>What movie are you looking for?</div>
              {!hasKey && canSearchFree && (
                <div style={s.freeBanner}>
                  ✨ You have {FREE_LIMIT - freeSearches} free search{FREE_LIMIT - freeSearches !== 1 ? "es" : ""}. <span style={s.freeBannerLink} onClick={() => setShowKeyModal(true)}>Add your API key</span> for unlimited.
                </div>
              )}
              <div style={s.emptyGrid}>
                {SUGGESTIONS.map(q => (
                  <div key={q} style={s.emptyChip} onClick={() => submitQuery(q)}>{q}</div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? s.userRow : s.assistantRow}>
              {msg.role === "user" && <div style={s.userBubble}>{msg.text}</div>}
              {msg.role === "assistant" && (
                <div style={s.assistantBubble}>
                  {msg.type && (
                    <div style={s.typeBadgeRow}>
                      <span style={msg.type === "graph" ? s.graphBadge : s.similarityBadge}>
                        {msg.type === "graph" ? "📊 Graph Query" : "🔍 Similarity Search"}
                      </span>
                    </div>
                  )}
                  <div style={s.answerText}>
                    {msg.text.split("\n").map((line, j) => (
                      <span key={j}>{line}{j < msg.text.split("\n").length - 1 && <br />}</span>
                    ))}
                  </div>
                </div>
              )}
              {msg.role === "error" && <div style={s.errorBubble}>⚠️ {msg.text}</div>}
            </div>
          ))}

          {loading && (
            <div style={s.assistantRow}>
              <div style={s.loadingBubble}>
                <div style={s.dots}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div key={i} style={{ ...s.dot, animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Blocked state */}
        {!canSearch && !hasKey && (
          <div style={s.blockedBanner}>
            <span>You've used your free search.</span>
            <button style={s.blockedBtn} onClick={() => setShowKeyModal(true)}>
              Add API Key to Continue →
            </button>
          </div>
        )}

        <div style={s.inputArea}>
          <div style={s.inputWrapper}>
            <textarea
              ref={inputRef}
              style={{ ...s.textarea, opacity: !canSearch ? 0.4 : 1 }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={canSearch ? "Ask about movies, directors, actors, recommendations..." : "Add your API key to continue..."}
              rows={1}
              disabled={!canSearch}
            />
            <button
              style={{ ...s.sendBtn, opacity: loading || !input.trim() || !canSearch ? 0.4 : 1 }}
              onClick={() => submitQuery(input)}
              disabled={loading || !input.trim() || !canSearch}
            >↑</button>
          </div>
          <div style={s.hint}>Enter to send · Shift+Enter for new line</div>
        </div>
      </main>

      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0);opacity:.4}
          40%{transform:translateY(-5px);opacity:1}
        }
      `}</style>
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", background: "#080a0f", overflow: "hidden" },

  // Modal
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px", padding: "36px 32px", maxWidth: "420px", width: "90%",
    position: "relative",
  },
  modalClose: {
    position: "absolute", top: "16px", right: "16px",
    background: "none", border: "none", color: "#8a8f9a",
    fontSize: "16px", cursor: "pointer",
  },
  modalIcon: { marginBottom: "12px", display: "flex", justifyContent: "flex-start" },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: "26px", letterSpacing: "1px", marginBottom: "10px" },
  modalDesc: { fontSize: "13px", color: "#8a8f9a", lineHeight: 1.7, marginBottom: "16px" },
  modalSteps: { marginBottom: "18px" },
  modalLink: { color: "#e8c547", fontSize: "13px", textDecoration: "none" },
  keyInput: {
    width: "100%", background: "#080a0f", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px", padding: "12px 14px", color: "#f0ede8",
    fontFamily: "var(--font-body)", fontSize: "13px", outline: "none",
    marginBottom: "6px", letterSpacing: "1px",
  },
  keyError: { color: "#ff6b6b", fontSize: "12px", marginBottom: "10px" },
  keySuccess: { color: "#4ade80", fontSize: "12px", marginBottom: "10px" },
  saveKeyBtn: {
    width: "100%", background: "#e8c547", color: "#080a0f", border: "none",
    padding: "12px", borderRadius: "8px", cursor: "pointer",
    fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "14px",
    marginBottom: "12px",
  },
  keyNote: { fontSize: "11px", color: "#4a505c", lineHeight: 1.6, textAlign: "center" },

  // Sidebar
  sidebar: {
    width: "240px", flexShrink: 0, background: "#0a0c12",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column",
  },
  sideTop: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  logo: { fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "3px", cursor: "pointer" },
  acc: { color: "#e8c547" },
  newChat: {
    background: "rgba(232,197,71,0.12)", border: "1px solid rgba(232,197,71,0.25)",
    color: "#e8c547", padding: "5px 12px", borderRadius: "4px",
    cursor: "pointer", fontSize: "11px", fontFamily: "var(--font-body)",
  },

  keyStatus: { padding: "12px 12px 4px" },
  keyActive: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.15)",
    borderRadius: "8px", padding: "8px 10px", fontSize: "11px", color: "#4ade80",
  },
  keyDot: { width: "6px", height: "6px", background: "#4ade80", borderRadius: "50%", flexShrink: 0 },
  keyLabel: { flex: 1 },
  removeKey: { background: "none", border: "none", color: "#4a505c", cursor: "pointer", fontSize: "11px" },
  keyInactive: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(232,197,71,0.07)", border: "1px solid rgba(232,197,71,0.15)",
    borderRadius: "8px", padding: "8px 10px", fontSize: "11px", color: "#e8c547",
    cursor: "pointer",
  },
  keyInactiveContent: { display: "flex", alignItems: "center", gap: "6px" },
  freeCount: { background: "rgba(232,197,71,0.15)", padding: "2px 7px", borderRadius: "10px", fontSize: "10px" },
  freeOut: { color: "#ff6b6b", fontSize: "10px" },

  sideLabel: { padding: "16px 16px 6px", fontSize: "9px", letterSpacing: "2px", color: "#4a505c", textTransform: "uppercase" },
  sideLinks: { flex: 1, overflow: "auto", padding: "0 8px" },
  sideLink: {
    padding: "8px 10px", fontSize: "12px", color: "#8a8f9a",
    borderRadius: "5px", cursor: "pointer", marginBottom: "2px", lineHeight: 1.4,
  },
  sideBottom: { padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  sideNav: { 
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 10px", fontSize: "12px", color: "#8a8f9a", cursor: "pointer", borderRadius: "5px" 
  },

  // Main
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
  },
  headerTitle: { fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "2px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  headerBadges: { display: "flex", gap: "8px" },
  badge: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
    padding: "3px 10px", borderRadius: "100px", fontSize: "10px", color: "#8a8f9a",
  },
  addKeyBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "rgba(232,197,71,0.1)", border: "1px solid rgba(232,197,71,0.25)",
    color: "#e8c547", padding: "5px 14px", borderRadius: "6px",
    cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-body)",
  },

  messages: { flex: 1, overflow: "auto", padding: "28px 40px", display: "flex", flexDirection: "column", gap: "20px" },

  emptyState: { margin: "auto", textAlign: "center", maxWidth: "560px" },
  emptyTitle: { fontFamily: "var(--font-display)", fontSize: "32px", letterSpacing: "1px", marginBottom: "16px", color: "#f0ede8", opacity: 0.6 },
  freeBanner: {
    background: "rgba(232,197,71,0.07)", border: "1px solid rgba(232,197,71,0.15)",
    borderRadius: "8px", padding: "10px 16px", fontSize: "13px", color: "#e8c547",
    marginBottom: "20px",
  },
  freeBannerLink: { textDecoration: "underline", cursor: "pointer" },
  emptyGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  emptyChip: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "12px 16px", borderRadius: "8px", fontSize: "13px", color: "#8a8f9a",
    cursor: "pointer", textAlign: "left",
  },

  userRow: { display: "flex", justifyContent: "flex-end" },
  assistantRow: { display: "flex", justifyContent: "flex-start" },
  userBubble: {
    background: "#e8c547", color: "#080a0f", padding: "12px 18px",
    borderRadius: "16px 16px 4px 16px", fontSize: "14px", maxWidth: "65%", lineHeight: 1.6,
  },
  assistantBubble: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "16px 20px", borderRadius: "4px 16px 16px 16px",
    fontSize: "14px", maxWidth: "75%", lineHeight: 1.7,
  },
  typeBadgeRow: { marginBottom: "10px" },
  graphBadge: {
    background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
    color: "#4ade80", padding: "3px 10px", borderRadius: "100px", fontSize: "10px",
  },
  similarityBadge: {
    background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)",
    color: "#818cf8", padding: "3px 10px", borderRadius: "100px", fontSize: "10px",
  },
  answerText: { color: "#d8d4cf", lineHeight: 1.75 },
  errorBubble: {
    background: "#1a0d0d", border: "1px solid rgba(255,80,80,0.2)",
    color: "#ff8080", padding: "12px 18px", borderRadius: "8px", fontSize: "13px", maxWidth: "65%",
  },

  loadingBubble: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "16px 20px", borderRadius: "4px 16px 16px 16px",
  },
  dots: { display: "flex", gap: "5px", alignItems: "center" },
  dot: { width: "6px", height: "6px", background: "#e8c547", borderRadius: "50%", animation: "bounce 1.2s infinite" },

  blockedBanner: {
    background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)",
    padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
    fontSize: "13px", color: "#ff6b35", flexShrink: 0,
  },
  blockedBtn: {
    background: "#ff6b35", color: "#fff", border: "none", padding: "8px 18px",
    borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-body)",
  },

  inputArea: { padding: "16px 40px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 },
  inputWrapper: { display: "flex", gap: "10px", alignItems: "flex-end" },
  textarea: {
    flex: 1, background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px", padding: "12px 16px", color: "#f0ede8",
    fontFamily: "var(--font-body)", fontSize: "14px", resize: "none",
    outline: "none", lineHeight: 1.6, minHeight: "48px",
  },
  sendBtn: {
    width: "44px", height: "44px", background: "#e8c547", border: "none",
    borderRadius: "10px", cursor: "pointer", fontSize: "18px", color: "#080a0f",
    fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  hint: { fontSize: "11px", color: "#4a505c", marginTop: "6px", textAlign: "center" },
};