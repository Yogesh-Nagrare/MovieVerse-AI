import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sendMessage } from "../api/chat.js";

const SUGGESTIONS = [
  "Action movies with Zendaya",
  "Tell me about Movie 0315",
  "Movies similar to Inception",
  "Who directed Movie 0001?",
  "How is Zendaya related to James Cameron?",
  "Recommend thriller movies",
];

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Handle initial query from Landing or Dashboard
  useEffect(() => {
    const q = location.state?.initialQuery;
    if (q) {
      submitQuery(q);
      window.history.replaceState({}, "");
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submitQuery(query) {
    if (!query.trim() || loading) return;
    const q = query.trim();
    setInput("");

    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const data = await sendMessage(q);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: data.answer,
        type: data.classification?.type,
        reasoning: data.classification?.reasoning,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "error",
        text: err.message,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuery(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <span style={s.logo} onClick={() => navigate("/")}>
            MV<span style={s.acc}>AI</span>
          </span>
          <button style={s.newChat} onClick={() => setMessages([])}>
            + New
          </button>
        </div>

        <div style={s.sideLabel}>QUICK QUERIES</div>
        <div style={s.sideLinks}>
          {SUGGESTIONS.map((s_) => (
            <div key={s_} style={s.sideLink} onClick={() => submitQuery(s_)}>
              {s_}
            </div>
          ))}
        </div>

        <div style={s.sideBottom}>
          <div style={s.sideNav} onClick={() => navigate("/dashboard")}>📊 Dashboard</div>
          <div style={s.sideNav} onClick={() => navigate("/")}>🏠 Home</div>
        </div>
      </aside>

      {/* Main */}
      <main style={s.main}>
        {/* Header */}
        <header style={s.header}>
          <span style={s.headerTitle}>Movie Assistant</span>
          <div style={s.headerBadges}>
            <span style={s.badge}>Neo4j</span>
            <span style={s.badge}>Pinecone</span>
            <span style={s.badge}>Gemini</span>
          </div>
        </header>

        {/* Messages */}
        <div style={s.messages}>
          {isEmpty && (
            <div style={s.emptyState}>
              <div style={s.emptyTitle}>What movie are you looking for?</div>
              <div style={s.emptyGrid}>
                {SUGGESTIONS.map((q) => (
                  <div key={q} style={s.emptyChip} onClick={() => submitQuery(q)}>
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? s.userRow : s.assistantRow}>
              {msg.role === "user" && (
                <div style={s.userBubble}>{msg.text}</div>
              )}

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
                      <span key={j}>
                        {line}
                        {j < msg.text.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {msg.role === "error" && (
                <div style={s.errorBubble}>
                  ⚠️ {msg.text}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={s.assistantRow}>
              <div style={s.loadingBubble}>
                <div style={s.dots}>
                  <div style={{ ...s.dot, animationDelay: "0s" }} />
                  <div style={{ ...s.dot, animationDelay: "0.2s" }} />
                  <div style={{ ...s.dot, animationDelay: "0.4s" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={s.inputArea}>
          <div style={s.inputWrapper}>
            <textarea
              ref={inputRef}
              style={s.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about movies, directors, actors, recommendations..."
              rows={1}
            />
            <button
              style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }}
              onClick={() => submitQuery(input)}
              disabled={loading || !input.trim()}
            >
              ↑
            </button>
          </div>
          <div style={s.hint}>Enter to send · Shift+Enter for new line</div>
        </div>
      </main>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        .side-link:hover { background: rgba(255,255,255,0.04) !important; color: #f0ede8 !important; }
        .empty-chip:hover { border-color: rgba(232,197,71,0.4) !important; color: #f0ede8 !important; }
        .send-btn:hover:not(:disabled) { background: #d4b03c !important; }
      `}</style>
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", background: "#080a0f", overflow: "hidden" },

  // Sidebar
  sidebar: {
    width: "240px", flexShrink: 0, background: "#0a0c12",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column", padding: "0",
  },
  sideTop: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  logo: { fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "3px", cursor: "pointer" },
  acc: { color: "#e8c547" },
  newChat: {
    background: "rgba(232,197,71,0.12)", border: "1px solid rgba(232,197,71,0.25)",
    color: "#e8c547", padding: "5px 12px", borderRadius: "4px",
    cursor: "pointer", fontSize: "11px", fontFamily: "var(--font-body)",
  },
  sideLabel: { padding: "20px 16px 8px", fontSize: "9px", letterSpacing: "2px", color: "#4a505c", textTransform: "uppercase" },
  sideLinks: { flex: 1, overflow: "auto", padding: "0 8px" },
  sideLink: {
    padding: "8px 10px", fontSize: "12px", color: "#8a8f9a",
    borderRadius: "5px", cursor: "pointer", marginBottom: "2px",
    lineHeight: 1.4, transition: "all 0.15s",
  },
  sideBottom: { padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" },
  sideNav: { padding: "8px 10px", fontSize: "12px", color: "#8a8f9a", cursor: "pointer", borderRadius: "5px" },

  // Main
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
  },
  headerTitle: { fontFamily: "var(--font-display)", fontSize: "18px", letterSpacing: "2px" },
  headerBadges: { display: "flex", gap: "8px" },
  badge: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
    padding: "3px 10px", borderRadius: "100px", fontSize: "10px", color: "#8a8f9a",
  },

  // Messages
  messages: { flex: 1, overflow: "auto", padding: "28px 40px", display: "flex", flexDirection: "column", gap: "20px" },

  emptyState: { margin: "auto", textAlign: "center", maxWidth: "560px" },
  emptyTitle: { fontFamily: "var(--font-display)", fontSize: "32px", letterSpacing: "1px", marginBottom: "24px", color: "#f0ede8", opacity: 0.6 },
  emptyGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  emptyChip: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "12px 16px", borderRadius: "8px", fontSize: "13px", color: "#8a8f9a",
    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
  },

  userRow: { display: "flex", justifyContent: "flex-end" },
  assistantRow: { display: "flex", justifyContent: "flex-start" },

  userBubble: {
    background: "#e8c547", color: "#080a0f",
    padding: "12px 18px", borderRadius: "16px 16px 4px 16px",
    fontSize: "14px", maxWidth: "65%", fontWeight: 400, lineHeight: 1.6,
  },
  assistantBubble: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "16px 20px", borderRadius: "4px 16px 16px 16px",
    fontSize: "14px", maxWidth: "75%", lineHeight: 1.7,
  },
  typeBadgeRow: { marginBottom: "10px" },
  graphBadge: {
    background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
    color: "#4ade80", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", letterSpacing: "0.5px",
  },
  similarityBadge: {
    background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)",
    color: "#818cf8", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", letterSpacing: "0.5px",
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
  dot: {
    width: "6px", height: "6px", background: "#e8c547", borderRadius: "50%",
    animation: "bounce 1.2s infinite",
  },

  // Input
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
    fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.2s",
  },
  hint: { fontSize: "11px", color: "#4a505c", marginTop: "6px", textAlign: "center" },
};