import { useNavigate } from "react-router-dom";
import { 
  User, 
  Clapperboard, 
  Film, 
  Search, 
  Share2, 
  Trophy, 
  Database, 
  Cpu, 
  Layers, 
  MessageSquare, 
  Zap,
  ArrowRight,
  ChevronRight,
  Activity
} from "lucide-react";

const STATS = [
  { value: "1,240", label: "Movies Indexed", icon: <Film size={16} /> },
  { value: "15.8k", label: "Graph Relationships", icon: <Share2 size={16} /> },
  { value: "1,240", label: "Vector Embeddings", icon: <Layers size={16} /> },
  { value: "384", label: "Embedding Dimensions", icon: <Activity size={16} /> },
];

const CATEGORIES = [
  { name: "Actor Queries", icon: <User size={18} />, examples: ["Action movies with Zendaya", "Movies starring Tom Hardy"] },
  { name: "Director Queries", icon: <Clapperboard size={18} />, examples: ["Who directed Movie 0001?", "Tell me about James Cameron"] },
  { name: "Genre Queries", icon: <Film size={18} />, examples: ["How many romance movies?", "Best sci-fi movies"] },
  { name: "Similarity Search", icon: <Search size={18} />, examples: ["Movies similar to Inception", "Recommend thriller movies"] },
  { name: "Relationship", icon: <Share2 size={18} />, examples: ["Zendaya relation to James Cameron", "Path between two actors"] },
  { name: "Awards", icon: <Trophy size={18} />, examples: ["Movies that won Oscar", "Best Picture winners"] },
];

export default function Dashboard() {
  const navigate = useNavigate();

  function goToChat(query) {
    navigate("/chat", { state: { initialQuery: query } });
  }

  return (
    <div style={s.page}>
      {/* Navigation */}
      <nav style={s.nav}>
        <span style={s.logo} onClick={() => navigate("/")}>
          MOVIEVERSE<span style={s.acc}>AI</span>
        </span>
        <button style={s.chatBtn} onClick={() => navigate("/chat")}>
          <MessageSquare size={16} style={{ marginRight: 8 }} />
          Open Chat
        </button>
      </nav>

      <div style={s.content}>
        <div style={s.headerRow}>
          <div>
            <p style={s.eyebrow}>System Status: Operational</p>
            <h1 style={s.title}>Engine Dashboard</h1>
          </div>
          <button style={s.askBtn} onClick={() => navigate("/chat")}>
            Ask a Question <ArrowRight size={14} style={{ marginLeft: 8 }} />
          </button>
        </div>

        {/* Stats Grid */}
        <div style={s.statsGrid}>
          {STATS.map((stat) => (
            <div key={stat.label} style={s.statCard}>
              <div style={s.statHeader}>
                <span style={s.statIcon}>{stat.icon}</span>
                <span style={s.statLabel}>{stat.label}</span>
              </div>
              <div style={s.statValue}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Architecture Section */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Infrastructure Stack</h2>
          <div style={s.archRow}>
            {[
              { name: "Gemini 1.5", role: "LLM Orchestrator", color: "#4285f4", icon: <Zap size={18} /> },
              { name: "Neo4j Aura", role: "Knowledge Graph", color: "#018bff", icon: <Share2 size={18} /> },
              { name: "Pinecone", role: "Vector Database", color: "#00c8a0", icon: <Database size={18} /> },
              { name: "HuggingFace", role: "Local Embeddings", color: "#ff9d00", icon: <Cpu size={18} /> },
            ].map((item) => (
              <div key={item.name} style={s.archCard}>
                <div style={{ ...s.archIconBox, color: item.color }}>{item.icon}</div>
                <div>
                  <div style={s.archName}>{item.name}</div>
                  <div style={s.archRole}>{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Query Categories - Interactive Diagram Look */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Query Processing Capabilities</h2>
          <div style={s.catGrid}>
            {CATEGORIES.map((cat) => (
              <div key={cat.name} style={s.catCard}>
                <div style={s.catHeader}>
                  <span style={s.catIcon}>{cat.icon}</span>
                  <span style={s.catName}>{cat.name}</span>
                </div>
                <div style={s.catExamples}>
                  {cat.examples.map((ex) => (
                    <div
                      key={ex}
                      style={s.exampleRow}
                      onClick={() => goToChat(ex)}
                    >
                      <span style={s.exampleText}>{ex}</span>
                      <ChevronRight size={12} className="arrow" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Diagram */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Inference Pipeline</h2>
          <div style={s.flowContainer}>
            {[
              { step: "01", title: "Resolution", desc: "NER entity extraction" },
              { step: "02", title: "Routing", desc: "Graph vs Vector logic" },
              { step: "03", title: "Retrieval", desc: "Context fetching" },
              { step: "04", title: "Synthesis", desc: "Gemini response gen" },
            ].map((f, i) => (
              <div key={f.step} style={s.flowItem}>
                <div style={s.flowCard}>
                  <div style={s.flowStep}>{f.step}</div>
                  <div style={s.flowTitle}>{f.title}</div>
                  <div style={s.flowDesc}>{f.desc}</div>
                </div>
                {i < 3 && <div style={s.flowConnector}><ArrowRight size={16} /></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { 
    minHeight: "100vh", 
    background: "#080a0f", 
    color: "#f0ede8",
    fontFamily: "var(--font-body)"
  },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky", top: 0, background: "rgba(8,10,15,0.8)", backdropFilter: "blur(10px)", zIndex: 100,
  },
  logo: {
    fontFamily: "var(--font-display)", fontSize: "18px",
    letterSpacing: "3px", cursor: "pointer",
  },
  acc: { color: "#e8c547" },
  chatBtn: {
    display: "flex", alignItems: "center",
    background: "#e8c547", color: "#080a0f", border: "none",
    padding: "8px 18px", borderRadius: "4px", cursor: "pointer",
    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "13px",
  },
  content: { maxWidth: "1100px", margin: "0 auto", padding: "60px 40px" },
  headerRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "48px" },
  eyebrow: { fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "#e8c547", fontWeight: 600, marginBottom: "8px" },
  title: { fontFamily: "var(--font-display)", fontSize: "48px", letterSpacing: "1px", margin: 0 },
  askBtn: {
    display: "flex", alignItems: "center",
    background: "transparent", border: "1px solid rgba(232,197,71,0.35)",
    color: "#e8c547", padding: "12px 24px", borderRadius: "4px",
    cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden", marginBottom: "64px" },
  statCard: { background: "#080a0f", padding: "24px" },
  statHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" },
  statIcon: { color: "#8a8f9a", opacity: 0.7 },
  statValue: { fontFamily: "var(--font-display)", fontSize: "32px", color: "#e8c547" },
  statLabel: { fontSize: "11px", color: "#8a8f9a", textTransform: "uppercase", letterSpacing: "1px" },
  section: { marginBottom: "64px" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "1px", marginBottom: "24px", color: "#f0ede8", borderLeft: "3px solid #e8c547", paddingLeft: "12px" },
  archRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" },
  archCard: {
    display: "flex", alignItems: "center", gap: "16px",
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "20px", borderRadius: "10px",
  },
  archIconBox: { background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", display: "flex" },
  archName: { fontSize: "14px", fontWeight: 600, color: "#f0ede8", marginBottom: "2px" },
  archRole: { fontSize: "11px", color: "#8a8f9a" },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" },
  catCard: { background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "24px" },
  catHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" },
  catIcon: { color: "#e8c547", background: "rgba(232,197,71,0.1)", padding: "6px", borderRadius: "6px" },
  catName: { fontSize: "14px", fontWeight: 600, color: "#f0ede8" },
  catExamples: { display: "flex", flexDirection: "column", gap: "10px" },
  exampleRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", cursor: "pointer",
    padding: "10px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
    transition: "all 0.2s",
  },
  exampleText: { fontSize: "12px", color: "#8a8f9a" },
  flowContainer: { display: "flex", alignItems: "center" },
  flowItem: { flex: 1, display: "flex", alignItems: "center" },
  flowCard: {
    flex: 1, background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)",
    padding: "24px 20px", borderRadius: "10px", textAlign: "center"
  },
  flowStep: { fontSize: "10px", color: "#e8c547", fontWeight: 800, marginBottom: "8px", opacity: 0.6 },
  flowTitle: { fontSize: "14px", fontWeight: 600, marginBottom: "4px" },
  flowDesc: { fontSize: "11px", color: "#8a8f9a" },
  flowConnector: { padding: "0 10px", color: "#e8c547", opacity: 0.3 }
};