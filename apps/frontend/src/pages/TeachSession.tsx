import { useState } from "react";
import { useLiveSession } from "../session/useLiveSession";

export function TeachingSession() {
  const { messages, sendUserMessage } = useLiveSession();
  const [input, setInput] = useState("");

  return (
    <div style={{ padding: 24 }}>
      <h2>Live AI Math Teacher</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: 12,
          minHeight: 120,
          marginBottom: 12,
        }}
      >
        {messages.map((msg, i) => (
          <p key={i}>{msg}</p>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Say or type your answer..."
        style={{ width: "80%", marginRight: 8 }}
      />

      <button
        onClick={() => {
          sendUserMessage(input);
          setInput("");
        }}
      >
        Send
      </button>
    </div>
  );
}
