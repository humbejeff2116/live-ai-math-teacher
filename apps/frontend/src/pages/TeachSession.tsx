import { useState } from "react";
import { useLiveSession } from "../session/useLiveSession";
import { useSpeechInput } from "../speech/useSpeechInput";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { EquationSteps } from "../components/EquationSteps";

export function TeachingSession() {
  const { 
    // messages, 
    streamingText, 
    equationSteps, 
    sendUserMessage 
  } = useLiveSession();
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);

  const { startListening } = useSpeechInput(
  (text) => {
    sendUserMessage(text);
  },
  setIsListening
);

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
        {streamingText && (
          <div className="ai-streaming">
            {streamingText}
            <span className="cursor">▍</span>
          </div>
        )}
        {equationSteps && (
          <EquationSteps steps={equationSteps}/>
        )}
        {/* {messages.map((msg, i) => (
          <p key={i}>{msg}</p>
        ))} */}
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your answer..."
          style={{ width: "70%", marginRight: 8 }}
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

      <VoiceInputButton
        listening={isListening}
        handleStartListening={startListening}
      />
    </div>
  );
}
