import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Network, Search, Sparkles, MoveRight } from "lucide-react";

const FILMS = ["Inception", "The Dark Knight", "Interstellar", "Parasite", "Dune", "Oppenheimer"];

export default function Landing() {
  const navigate = useNavigate();
  const [filmIdx, setFilmIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setFilmIdx(i => (i + 1) % FILMS.length);
        setVisible(true);
      }, 400);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={s.page}>
      {/* Film grain overlay */}
      <div style={s.grain} />

      {/* Nav */}
      <nav style={s.nav}>
        <span style={s.logo}>MOVIEVERSE<span style={s.logoAccent}>AI</span></span>
        <button style={s.navBtn} onClick={() => navigate("/chat")}>
          Launch App <MoveRight size={14} style={{ marginLeft: 8 }} />
        </button>
      </nav>

      {/* Hero */}
      <main style={s.hero}>
        <p style={s.eyebrow}>Powered by GraphRAG + Neo4j + Pinecone</p>

        <h1 style={s.title}>
          Find Your Next<br />
          <span
            style={{
              ...s.titleAccent,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
            }}
          >
            {FILMS[filmIdx]}
          </span>
        </h1>

        <p style={s.sub}>
          Ask in natural language. Get intelligent recommendations powered by<br />
          a knowledge graph of 1000+ movies with relationships between actors,<br />
          directors, genres, and themes.
        </p>

        <div style={s.btnRow}>
          <button style={s.btnPrimary} onClick={() => navigate("/chat")}>
            Start Asking <MoveRight size={18} style={{ marginLeft: 8 }} />
          </button>
          <button style={s.btnSecondary} onClick={() => navigate("/dashboard")}>
            Explore Dashboard
          </button>
        </div>

        {/* Sample queries */}
        <div style={s.queries}>
          {[
            "Action movies with Zendaya",
            "Tell me about Movie 0315",
            "Movies similar to Inception",
            "Who directed Movie 0001?",
          ].map((q) => (
            <span
              key={q}
              style={s.queryChip}
              onClick={() => navigate("/chat", { state: { initialQuery: q } })}
            >
              {q}
            </span>
          ))}
        </div>
      </main>

      {/* Features */}
      <section style={s.features}>
        {[
          { 
            icon: <Network size={24} color="#e8c547" />, 
            title: "Knowledge Graph", 
            desc: "Neo4j stores 1000+ movies with rich relationships between entities" 
          },
          { 
            icon: <Search size={24} color="#e8c547" />, 
            title: "Semantic Search", 
            desc: "Pinecone vector search finds movies by meaning, not just keywords" 
          },
          { 
            icon: <Sparkles size={24} color="#e8c547" />, 
            title: "Gemini AI", 
            desc: "Natural language answers powered by Gemini flash-lite" 
          },
          ].map((f) => (
          <div key={f.title} style={s.featureCard}>
            <span style={s.featureIcon}>{f.icon}</span>
            <h3 style={s.featureTitle}>{f.title}</h3>
            <p style={s.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #080a0f 0%, #0d1520 50%, #080a0f 100%)",
    position: "relative",
    overflow: "hidden",
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
    pointerEvents: "none",
    zIndex: 0,
    opacity: 0.6,
  },
  nav: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 48px",
  },
  logo: {
    fontFamily: "var(--font-display)",
    fontSize: "22px",
    letterSpacing: "3px",
    color: "#f0ede8",
  },
  logoAccent: { color: "#e8c547" },
  navBtn: {
    background: "transparent",
    border: "1px solid rgba(232,197,71,0.4)",
    color: "#e8c547",
    padding: "8px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.5px",
    transition: "all 0.2s",
  },
  hero: {
    position: "relative",
    zIndex: 10,
    maxWidth: "860px",
    margin: "0 auto",
    padding: "80px 48px 60px",
    textAlign: "center",
  },
  eyebrow: {
    fontSize: "11px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: "#e8c547",
    marginBottom: "24px",
    opacity: 0.8,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(64px, 10vw, 120px)",
    lineHeight: 0.95,
    letterSpacing: "2px",
    marginBottom: "32px",
    color: "#f0ede8",
  },
  titleAccent: {
    display: "block",
    color: "#e8c547",
    fontFamily: "var(--font-display)",
  },
  sub: {
    fontSize: "15px",
    color: "#8a8f9a",
    lineHeight: 1.8,
    marginBottom: "40px",
    fontWeight: 300,
  },
  btnRow: {
    display: "flex",
    gap: "14px",
    justifyContent: "center",
    marginBottom: "48px",
  },
  btnPrimary: {
    background: "#e8c547",
    color: "#080a0f",
    border: "none",
    padding: "14px 32px",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    fontWeight: 500,
    fontSize: "15px",
    letterSpacing: "0.3px",
    transition: "opacity 0.2s",
  },
  btnSecondary: {
    background: "transparent",
    color: "#f0ede8",
    border: "1px solid rgba(255,255,255,0.15)",
    padding: "14px 32px",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    fontWeight: 300,
    fontSize: "15px",
    transition: "border-color 0.2s",
  },
  queries: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
  },
  queryChip: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    padding: "8px 16px",
    borderRadius: "100px",
    fontSize: "13px",
    color: "#8a8f9a",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  features: {
    position: "relative",
    zIndex: 10,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.06)",
    margin: "0",
  },
  featureCard: {
    background: "#080a0f",
    padding: "48px 40px",
    textAlign: "left",
  },
  featureIcon: { fontSize: "28px", display: "block", marginBottom: "16px" },
  featureTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "22px",
    letterSpacing: "1px",
    marginBottom: "10px",
    color: "#f0ede8",
  },
  featureDesc: { fontSize: "13px", color: "#8a8f9a", lineHeight: 1.7 },
};