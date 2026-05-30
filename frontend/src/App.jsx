import { useState } from "react";
import axios from "axios";

function App() {

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const sendMessage = async () => {

    if (!message.trim()) return;

    const userMessage = {
      role: "user",
      text: message
    };

    setMessages(prev => [
      ...prev,
      userMessage
    ]);

    setLoading(true);

    try {

      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/chat`,
        {
          message
        }
      );

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: res.data.answer
        }
      ]);

    } catch (err) {

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong"
        }
      ]);
    }

    setMessage("");
    setLoading(false);
  };

  return (
    <div className="container">

      <h1>
        🎬 Movie GraphRAG
      </h1>

      <div className="chat-window">

        {messages.map((msg, idx) => (

          <div
            key={idx}
            className={msg.role}
          >
            {msg.text}
          </div>

        ))}

        {loading && (
          <div>
            Thinking...
          </div>
        )}

      </div>

      <div className="input-area">

        <input
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          placeholder="Ask about movies..."
        />

        <button
          onClick={sendMessage}
        >
          Send
        </button>

      </div>

    </div>
  );
}

export default App;