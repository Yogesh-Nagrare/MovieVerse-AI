import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Plus, 
  MessageSquare, 
  LayoutDashboard, 
  Home, 
  Send, 
  Search, 
  Share2, 
  Terminal,
  Info,
  History,
  Sparkles
} from "lucide-react";
import { sendMessage } from "../api/chat.js";

const SUGGESTIONS = [
  { icon: <Search size={14} />, text: "Action movies with Zendaya" },
  { icon: <Info size={14} />, text: "Tell me about Movie 0315" },
  { icon: <Sparkles size={14} />, text: "Movies similar to Inception" },
  { icon: <Terminal size={14} />, text: "Who directed Movie 0001?" },
  { icon: <Share2 size={14} />, text: "Zendaya relation to James Cameron" },
];

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
      setMessages(prev => [...prev, { role: "error", text: err.message }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuery(input);
    }
  };

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sideTop}>
          <div style={s.logo} onClick={() => navigate("/")}>
            MV<span style={s.acc}>AI</span>
          </div>
          <button style={s.newChat} onClick={() => setMessages([])}>
            <Plus size={14} /> <span>New Chat</span>
          </button>
        </div>

        <div style={s.sideSection}>
          <div style={s.sideLabel}>Suggested Queries</div>
          <div style={s.sideLinks}>
            {SUGGESTIONS.map((s_) => (
              <div key={s_.text} style={s.sideLink} onClick={() => submitQuery(s_.text)}>
                <span style={s.sideLinkIcon}>{s_.icon}</span>
                <span style={s.sideLinkText}>{s_.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={s.sideBottom}>
          <div style={s.sideNav} onClick={() => navigate("/dashboard")}>
            <LayoutDashboard size={16} /> <span>Dashboard</span>
          </div>
          <div style={s.sideNav} onClick={() => navigate("/")}>
            <Home size={16} /> <span>Back to Home</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main style={s.main}>
        <header style={s.header}>
          <div style={s.headerLeft}>
            <MessageSquare size={18} color="#e8c547" />
            <span style={s.headerTitle}>GraphRAG Assistant</span>
          </div>
          <div style={s.headerBadges}>
            <div style={s.statusBadge}><div style={s.statusDot} /> System Live</div>
            <span style={s.badge}>Neo4j</span>
            <span style={s.badge}>Pinecone</span>
          </div>
        </header>

        <div style={s.messagesContainer}>
          {messages.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}><Sparkles size={40} color="#e8c547" /></div>
              <h2 style={s.emptyTitle}>How can I help you today?</h2>
              <p style={s.emptySub}>Ask about movie connections, similar films, or technical credits.</p>
              <div style={s.emptyGrid}>
                {SUGGESTIONS.map((q) => (
                  <div key={q.text} style={s.emptyChip} onClick={() => submitQuery(q.text)}>
                    {q.icon} <span>{q.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? s.userRow : s.assistantRow}>
                <div style={msg.role === "user" ? s.userBubble : s.assistantBubble}>
                {msg.role === "assistant" && msg.type && (
                    <div style={s.reasoningCard}>
                    <div style={s.reasoningHeader}>
                        {msg.type === "graph" ? <Share2 size={12} /> : <Search size={12} />}
                        <span>{msg.type.toUpperCase()} INFERENCE ENGINE</span>
                    </div>
                    {msg.reasoning && <div style={s.reasoningText}>{msg.reasoning}</div>}
                    </div>
                )}
                
                {/* UPDATE THIS LINE BELOW */}
                <div style={{ 
                    ...s.messageText, 
                    color: msg.role === "user" ? "#d8d4cf" : "#d8d4cf" 
                }}>
                    {msg.text}
                </div>
                </div>
            </div>
            ))}

          {loading && (
            <div style={s.assistantRow}>
              <div style={s.loadingBubble}>
                <div style={s.dotAnim} />
                <div style={{...s.dotAnim, animationDelay: '0.2s'}} />
                <div style={{...s.dotAnim, animationDelay: '0.4s'}} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div style={s.inputArea}>
          <div style={s.inputContainer}>
            <textarea
              ref={inputRef}
              style={s.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Query the MovieVerse knowledge graph..."
              rows={1}
            />
            <button
              style={{ ...s.sendBtn, opacity: loading || !input.trim() ? 0.4 : 1 }}
              onClick={() => submitQuery(input)}
              disabled={loading || !input.trim()}
            >
              <Send size={18} />
            </button>
          </div>
          <div style={s.inputHint}>Press Enter to query system · Use Shift + Enter for multi-line</div>
        </div>
      </main>
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", background: "#080a0f", color: "#f0ede8", fontFamily: "'Inter', sans-serif" },
  
  // Sidebar
  sidebar: {
    width: "260px", background: "#0a0c12", borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex", flexDirection: "column",
  },
  sideTop: { padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  logo: { fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "3px", cursor: "pointer", marginBottom: "20px" },
  acc: { color: "#e8c547" },
  newChat: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "rgba(232,197,71,0.1)", border: "1px solid rgba(232,197,71,0.2)",
    color: "#e8c547", padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500,
  },
  sideSection: { flex: 1, overflowY: "auto", padding: "20px 12px" },
  sideLabel: { fontSize: "10px", fontWeight: 700, color: "#4a505c", textTransform: "uppercase", letterSpacing: "1px", paddingLeft: "10px", marginBottom: "12px" },
  sideLinks: { display: "flex", flexDirection: "column", gap: "4px" },
  sideLink: {
    display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px",
    cursor: "pointer", transition: "background 0.2s", color: "#8a8f9a"
  },
  sideLinkIcon: { opacity: 0.7 },
  sideLinkText: { fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sideBottom: { padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "4px" },
  sideNav: { 
    display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px",
    fontSize: "13px", color: "#8a8f9a", cursor: "pointer", transition: "all 0.2s" 
  },

  // Main
  main: { flex: 1, display: "flex", flexDirection: "column", position: "relative" },
  header: {
    height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,10,15,0.8)", backdropFilter: "blur(10px)"
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { fontSize: "14px", fontWeight: 600, letterSpacing: "0.5px" },
  headerBadges: { display: "flex", gap: "10px", alignItems: "center" },
  statusBadge: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "4px 10px", borderRadius: "100px" },
  statusDot: { width: "6px", height: "6px", background: "#4ade80", borderRadius: "50%" },
  badge: { fontSize: "10px", color: "#8a8f9a", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.1)" },

  // Messages
  messagesContainer: { flex: 1, overflowY: "auto", padding: "40px 0" },
  emptyState: { maxWidth: "600px", margin: "100px auto", textAlign: "center" },
  emptyIcon: { marginBottom: "20px" },
  emptyTitle: { fontSize: "28px", fontWeight: 700, marginBottom: "12px" },
  emptySub: { color: "#8a8f9a", fontSize: "15px", marginBottom: "40px" },
  emptyGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  emptyChip: {
    display: "flex", alignItems: "center", gap: "10px", background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "16px", borderRadius: "12px", cursor: "pointer", fontSize: "13px", color: "#8a8f9a", transition: "all 0.2s"
  },

  userRow: { display: "flex", justifyContent: "flex-end", padding: "0 10% 24px", width: "80%", margin: "0 auto" },
  assistantRow: { display: "flex", justifyContent: "flex-start", padding: "0 10% 24px", width: "80%", margin: "0 auto" },
  
  userBubble: { 
  background: "#080a0f", 
  padding: "12px 20px", 
  borderRadius: "20px 20px 4px 20px", 
  fontSize: "14px", 
  lineHeight: "1.6", 
  maxWidth: "80%",
  color: "#ffffff", // Add this to ensure default is dark
  boxShadow: "0 4px 15px rgba(232, 197, 71, 0.2)" // Optional: adds a nice glow
  },
  assistantBubble: { 
    width: "100%", background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "24px", borderRadius: "4px 20px 20px 20px", maxWidth: "90%" 
  },
  
  reasoningCard: { 
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px", padding: "12px", marginBottom: "16px" 
  },
  reasoningHeader: { display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: 800, color: "#e8c547", marginBottom: "6px", letterSpacing: "1px" },
  reasoningText: { fontSize: "12px", color: "#6a707c", fontStyle: "italic", lineHeight: "1.5" },
  messageText: { fontSize: "15px", lineHeight: "1.8", color: "#d8d4cf" },

  loadingBubble: { display: "flex", gap: "4px", padding: "12px 20px", background: "#0d1117", borderRadius: "20px" },
  dotAnim: { width: "6px", height: "6px", background: "#e8c547", borderRadius: "50%", animation: "chat-bounce 1.4s infinite ease-in-out" },

  // Input Area
  inputArea: { padding: "20px 10%", borderTop: "1px solid rgba(255,255,255,0.06)" },
  inputContainer: { 
    display: "flex", alignItems: "flex-end", gap: "12px", background: "#0d1117", 
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "10px 16px" 
  },
  textarea: { 
    flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0ede8",
    padding: "8px 0", fontSize: "14px", lineHeight: "1.5", resize: "none", minHeight: "24px" 
  },
  sendBtn: { 
    background: "#e8c547", border: "none", borderRadius: "12px", width: "40px", height: "40px",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s"
  },
  inputHint: { fontSize: "11px", color: "#4a505c", textAlign: "center", marginTop: "10px" }
};