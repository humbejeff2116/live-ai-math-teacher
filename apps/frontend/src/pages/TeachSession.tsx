import { useState } from "react";
import { useLiveSession } from "../session/useLiveSession";
import { useSpeechInput } from "../speech/useSpeechInput";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { EquationSteps } from "../components/EquationSteps";
import { useLiveAudio } from "../audio/useLiveAudio";
import { useDebugState } from "../state/debugState";

export function TeachingSession() {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const {
    // messages,
    streamingText,
    equationSteps,
    sendUserMessage,
    handleStudentSpeechFinal,
    reExplainStep,
    teacherState,
  } = useLiveSession();
  const { audioState } = useLiveAudio();
  const { startListening } = useSpeechInput((text) => {
    if (isListening) {
      handleStudentSpeechFinal(text);
    } else {
      sendUserMessage(text);
    }
  }, setIsListening);
  const { state: debugState } = useDebugState();

  return (
    <div style={{ padding: 24 }}>
      <h2>Live AI Math Teacher</h2>

      {/* <p style={{ opacity: 0.7 }}>
        {isListening
          ? "🎧 Listening…"
          : streamingText
          ? "🧠 Explaining…"
          : null}
      </p> */}

      {audioState === "playing" && (
        <p style={{ opacity: 0.7 }}>🔊 Teacher is speaking…</p>
      )}

      {/* {audioState === "interrupted" && (
        <p style={{ opacity: 0.6 }}>⛔ Interrupted</p>
      )} */}

      {/* TODO... fix this: Cannot find name 'TEACHER_LABEL' */}
      <p>
        🧠 Teacher: <strong>{TEACHER_LABEL[teacherState]}</strong>
      </p>

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
          <EquationSteps
            steps={equationSteps}
            activeStepId={debugState.activeStepId}
            onReExplain={reExplainStep}
          />
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
          style={{ width: "70%", marginRight: 8, padding: "9px 8px" }}
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
