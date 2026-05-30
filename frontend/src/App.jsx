import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, User, Bot, Loader2, Clapperboard } from "lucide-react";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = { role: "user", text: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/chat`,
        { message }
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data.answer },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Error: Could not connect to the movie database." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-center gap-2 p-4 bg-white border-b shadow-sm">
        <Clapperboard className="text-indigo-600" size={28} />
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          Movie <span className="text-indigo-600">GraphRAG</span>
        </h1>
      </header>

      {/* Chat Window */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
            <Clapperboard size={48} strokeWidth={1} />
            <p className="text-lg">Ask me anything about movies, actors, or directors!</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white border text-indigo-600"
              }`}>
                {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
              </div>

              {/* Bubble */}
              <div className={`p-4 rounded-2xl shadow-sm leading-relaxed ${
                msg.role === "user" 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 items-center text-slate-400 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-white border-t">
        <form 
          onSubmit={sendMessage}
          className="max-w-4xl mx-auto relative flex items-center"
        >
          <input
            className="w-full p-4 pr-14 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Search movies, cast or genres..."
          />
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Powered by GraphRAG & Neo4j
        </p>
      </footer>
    </div>
  );
}

export default App;