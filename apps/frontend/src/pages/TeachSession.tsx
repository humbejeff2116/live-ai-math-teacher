import { useState } from "react";
import { useLiveSession } from "../session/useLiveSession";
import { useSpeechInput } from "../speech/useSpeechInput";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { EquationSteps } from "../components/EquationSteps";
import { useLiveAudio } from "../audio/useLiveAudio";
import { Waveform } from "../components/WaveForm";
import type { TeacherState } from "@shared/types";
import { useWaveformStepPreview } from "../session/useWaveformStepPreview";


const TEACHER_LABEL: Record<TeacherState, string> = {
  idle: "Idle",
  thinking: "Thinking",
  explaining: "Explaining",
  "re-explaining": "Re-explaining",
  interrupted: "Interrupted",
  waiting: "Waiting",
};

export function TeachingSession() {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  // const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);
  // const [hoverStep, setHoverStep] = useState<EquationStep | null>(null);

  const {
    // messages,
    streamingText,
    equationSteps,
    sendUserMessage,
    handleStudentSpeechFinal,
    reExplainStep,
    teacherState,
    handleWaveformSeek,
    getStepTimeline,
  } = useLiveSession();

  const { 
    audioState, 
    waveform, 
    currentTimeMs 
  } = useLiveAudio();

  const { 
    startListening 
  } = useSpeechInput((text) => {
    if (isListening) {
      handleStudentSpeechFinal(text);
    } else {
      sendUserMessage(text);
    }
  }, setIsListening);

  const stepTimeline = getStepTimeline();
  const { previewStepId, hoverStep, hoverStepId, setHoverMs } = useWaveformStepPreview(
    stepTimeline,
    equationSteps
  );
  const activeStepId = stepTimeline.getActiveStep(currentTimeMs);
  const animatedStepId = hoverStepId ?? activeStepId ?? null;


  return (
    <div style={{ padding: 24 }}>
      <h2>Live AI Math Teacher</h2>
      {audioState === "playing" && (
        <>
          <p style={{ opacity: 0.7 }}>🔊 Teacher is speaking…</p>
          <Waveform
            waveform={waveform}
            stepRanges={stepTimeline?.getRanges() || []}
            durationMs={stepTimeline?.getTotalDurationMs() || 0}
            currentTimeMs={currentTimeMs}
            animatedStepId={animatedStepId}
            onHoverTime={setHoverMs}
            onSeek={handleWaveformSeek}
          />
          {hoverStep && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 10px",
                fontSize: 12,
                background: "rgba(0,0,0,0.75)",
                color: "white",
                borderRadius: 6,
                width: "fit-content",
                pointerEvents: "none",
              }}
            >
              Step {hoverStep.index + 1}
              {hoverStep.type ? ` – ${hoverStep.type}` : ""}
              <div style={{ opacity: 0.8 }}>{hoverStep.text}</div>
            </div>
          )}
        </>
      )}
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
            activeStepId={activeStepId}
            onReExplain={reExplainStep}
            previewStepId={previewStepId}
            hoverStepId={hoverStepId}
            animatedStepId={animatedStepId}
          />
        )}
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
