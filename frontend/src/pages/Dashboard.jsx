import { useNavigate } from "react-router-dom";

const STATS = [
  { value: "1,000+", label: "Movies Indexed" },
  { value: "15,000+", label: "Graph Relationships" },
  { value: "1,000", label: "Vector Embeddings" },
  { value: "384", label: "Embedding Dimensions" },
];

const CATEGORIES = [
  { name: "Actor Queries", icon: "🎭", examples: ["Action movies with Zendaya", "Movies starring Tom Hardy"] },
  { name: "Director Queries", icon: "🎬", examples: ["Who directed Movie 0001?", "Tell me about James Cameron"] },
  { name: "Genre Queries", icon: "🎞️", examples: ["How many romance movies?", "Best sci-fi movies"] },
  { name: "Similarity Search", icon: "🔍", examples: ["Movies similar to Inception", "Recommend thriller movies"] },
  { name: "Relationship", icon: "🕸️", examples: ["How is Zendaya related to James Cameron?", "Path between two actors"] },
  { name: "Awards", icon: "🏆", examples: ["Movies that won Oscar", "Best Picture winners"] },
];

export default function Dashboard() {
  const navigate = useNavigate();

  function goToChat(query) {
    navigate("/chat", { state: { initialQuery: query } });
  }

  return (
    <div style={s.page}>
      {/* Nav */}
      <nav style={s.nav}>
        <span style={s.logo} onClick={() => navigate("/")}>
          MOVIEVERSE<span style={s.acc}>AI</span>
        </span>
        <button style={s.chatBtn} onClick={() => navigate("/chat")}>
          Open Chat →
        </button>
      </nav>

      <div style={s.content}>
        <div style={s.headerRow}>
          <div>
            <p style={s.eyebrow}>System Overview</p>
            <h1 style={s.title}>Dashboard</h1>
          </div>
          <button style={s.askBtn} onClick={() => navigate("/chat")}>
            Ask a Question →
          </button>
        </div>

        {/* Stats */}
        <div style={s.statsGrid}>
          {STATS.map((stat) => (
            <div key={stat.label} style={s.statCard}>
              <div style={s.statValue}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Architecture */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Architecture</h2>
          <div style={s.archRow}>
            {[
              { name: "Gemini API", role: "Entity extraction + Final answers", color: "#4285f4" },
              { name: "Neo4j Aura", role: "Graph DB · Relationships", color: "#018bff" },
              { name: "Pinecone", role: "Vector DB · Semantic search", color: "#00c8a0" },
              { name: "HuggingFace", role: "Local embeddings · 384-dim", color: "#ff9d00" },
            ].map((item) => (
              <div key={item.name} style={s.archCard}>
                <div style={{ ...s.archDot, background: item.color }} />
                <div style={s.archName}>{item.name}</div>
                <div style={s.archRole}>{item.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Query categories */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Query Examples</h2>
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
                      <span style={s.exampleArrow}>→</span>
                      <span style={s.exampleText}>{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>How It Works</h2>
          <div style={s.flowRow}>
            {[
              { step: "01", title: "Entity Resolution", desc: "Extracts names from query and matches them to Neo4j nodes" },
              { step: "02", title: "Classification", desc: "Decides: Graph query (factual) or Similarity search (semantic)" },
              { step: "03", title: "Graph Traversal", desc: "Cypher query traverses relationships in Neo4j" },
              { step: "04", title: "Vector Search", desc: "384-dim embeddings find semantically similar movies in Pinecone" },
              { step: "05", title: "Gemini Answer", desc: "Gemini formats the retrieved data into a natural language answer" },
            ].map((f, i) => (
              <div key={f.step} style={s.flowCard}>
                <div style={s.flowStep}>{f.step}</div>
                <div style={s.flowTitle}>{f.title}</div>
                <div style={s.flowDesc}>{f.desc}</div>
                {i < 4 && <div style={s.flowArrow}>→</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#080a0f" },
  nav: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky", top: 0, background: "#080a0f", zIndex: 100,
  },
  logo: {
    fontFamily: "var(--font-display)", fontSize: "20px",
    letterSpacing: "3px", cursor: "pointer",
  },
  acc: { color: "#e8c547" },
  chatBtn: {
    background: "#e8c547", color: "#080a0f", border: "none",
    padding: "8px 20px", borderRadius: "4px", cursor: "pointer",
    fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "13px",
  },
  content: { maxWidth: "1100px", margin: "0 auto", padding: "40px 40px 80px" },
  headerRow: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "40px" },
  eyebrow: { fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "#e8c547", opacity: 0.8, marginBottom: "8px" },
  title: { fontFamily: "var(--font-display)", fontSize: "52px", letterSpacing: "2px" },
  askBtn: {
    background: "transparent", border: "1px solid rgba(232,197,71,0.35)",
    color: "#e8c547", padding: "10px 24px", borderRadius: "4px",
    cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", marginBottom: "48px" },
  statCard: { background: "#080a0f", padding: "32px 28px" },
  statValue: { fontFamily: "var(--font-display)", fontSize: "42px", letterSpacing: "1px", color: "#e8c547", marginBottom: "6px" },
  statLabel: { fontSize: "12px", color: "#8a8f9a", letterSpacing: "0.5px" },
  section: { marginBottom: "48px" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: "26px", letterSpacing: "2px", marginBottom: "20px", color: "#f0ede8", opacity: 0.9 },
  archRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" },
  archCard: {
    background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)",
    padding: "20px", borderRadius: "8px",
  },
  archDot: { width: "8px", height: "8px", borderRadius: "50%", marginBottom: "12px" },
  archName: { fontSize: "14px", fontWeight: 500, marginBottom: "4px" },
  archRole: { fontSize: "12px", color: "#8a8f9a" },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" },
  catCard: { background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", padding: "20px" },
  catHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" },
  catIcon: { fontSize: "18px" },
  catName: { fontSize: "13px", fontWeight: 500, color: "#f0ede8" },
  catExamples: { display: "flex", flexDirection: "column", gap: "8px" },
  exampleRow: {
    display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer",
    padding: "6px 8px", borderRadius: "4px", transition: "background 0.15s",
  },
  exampleArrow: { color: "#e8c547", fontSize: "11px", marginTop: "2px", flexShrink: 0 },
  exampleText: { fontSize: "12px", color: "#8a8f9a", lineHeight: 1.5 },
  flowRow: { display: "flex", gap: "0", position: "relative" },
  flowCard: {
    flex: 1, background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)",
    padding: "24px 20px", borderRadius: "8px", marginRight: "8px", position: "relative",
  },
  flowStep: { fontFamily: "var(--font-display)", fontSize: "32px", color: "#e8c547", opacity: 0.3, marginBottom: "8px" },
  flowTitle: { fontSize: "13px", fontWeight: 500, marginBottom: "6px" },
  flowDesc: { fontSize: "11px", color: "#8a8f9a", lineHeight: 1.6 },
  flowArrow: { position: "absolute", right: "-14px", top: "50%", transform: "translateY(-50%)", color: "#e8c547", opacity: 0.4, fontSize: "18px", zIndex: 1 },
};