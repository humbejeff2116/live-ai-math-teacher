import { useMemo, useState } from "react";
import { useLiveSession } from "../session/useLiveSession";
import { useSpeechInput } from "../speech/useSpeechInput";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { EquationSteps } from "../components/EquationSteps";
import { useLiveAudio } from "../audio/useLiveAudio";
import { Waveform } from "../components/WaveForm";
import { WaveSeekConfirm } from "../components/WaveSeekConfirm";
import type { TeacherState } from "@shared/types";
import { useWaveform } from "../session/useWaveformStepPreview";


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

  const {
    // messages,
    streamingText,
    equationSteps,
    sendUserMessage,
    handleStudentSpeechFinal,
    reExplainStep,
    teacherState,
    resumeFromStep,
    aiLifecycleTick,
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

  const {
    previewStepId,
    hoverStep,
    hoverStepId,
    hoverMs,
    pendingSeek,
    setHoverMs,
    setPendingSeek,
    handleOnseekRequest,
  } = useWaveform(
    stepTimeline,
    equationSteps,
    currentTimeMs,
    aiLifecycleTick
  );

  const activeStepId = stepTimeline.getActiveStep(currentTimeMs);
  const animatedStepId = hoverStepId ?? activeStepId ?? null;
  const hoverLabel = hoverStep
    ? `Step ${hoverStep.index + 1} \u2013 ${hoverStep.type}`
    : null;

  const stepById = useMemo(() => {
    return new Map(equationSteps.map((step) => [step.id, step]));
  }, [equationSteps]);


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
            hoverLabel={hoverLabel}
            hoverMs={hoverMs}
            onHoverTime={setHoverMs}
            onSeekRequest={handleOnseekRequest}
          />
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
            pendingStepId={pendingSeek?.stepId}
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

      {pendingSeek && stepById.has(pendingSeek.stepId) && (
        <WaveSeekConfirm
          step={stepById.get(pendingSeek.stepId)!}
          position={{ x: pendingSeek.x, y: pendingSeek.y }}
          onConfirm={() => {
            resumeFromStep(pendingSeek.stepId);
            setPendingSeek(null);
          }}
          onCancel={() => setPendingSeek(null)}
        />
      )}
    </div>
  );
}
