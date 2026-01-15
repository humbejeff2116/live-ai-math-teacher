import { useEffect, useState } from "react";
import { useLiveSession } from "../session/useLiveSession";
import { useSpeechInput } from "../speech/useSpeechInput";
import { VoiceInputButton } from "../components/VoiceInputButton";
import { EquationSteps } from "../components/EquationSteps";
import { useLiveAudio } from "../audio/useLiveAudio";
import { Waveform } from "../components/WaveForm";
import { WaveSeekConfirm } from "../components/WaveSeekConfirm";
import type { TeacherState } from "@shared/types";
import { useWaveform } from "../session/useWaveform";
import { useWaveSeek } from "../session/useWaveSeek";


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
    currentTimeMs,
    seekWithFadeMs,
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
  const activeStepId = stepTimeline.getActiveStep(currentTimeMs);

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

  const {
    isConfirmingSeek, 
    stepById,
    onConfirmWaveSeek,
    seekToastTimeoutRef,
    seekToast,
  } = useWaveSeek(
    aiLifecycleTick,
    stepTimeline,
    pendingSeek,
    setPendingSeek,
    equationSteps,
    activeStepId ?? null,
    currentTimeMs,
    seekWithFadeMs,
    resumeFromStep
  );



  const animatedStepId = hoverStepId ?? activeStepId ?? null;
  const hoverLabel = hoverStep
    ? `Step ${hoverStep.index + 1} \u2013 ${hoverStep.type}`
    : null;

  useEffect(() => {
    return () => {
      if (seekToastTimeoutRef.current != null) {
        window.clearTimeout(seekToastTimeoutRef.current);
        seekToastTimeoutRef.current = null;
      }
    };
  }, []);

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
            pendingStepLabel={pendingSeek ? "Resume here?" : undefined}
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

      {seekToast && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 60,
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 12,
            background: "rgba(15, 23, 42, 0.08)",
            color: "#0f172a",
            border: "1px solid rgba(15, 23, 42, 0.15)",
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
            transition: "opacity 160ms ease",
          }}
        >
          {seekToast.message}
        </div>
      )}

      {pendingSeek && stepById.has(pendingSeek.stepId) && (
        <WaveSeekConfirm
          step={stepById.get(pendingSeek.stepId)!}
          position={{ x: pendingSeek.x, y: pendingSeek.y }}
          isConfirming={isConfirmingSeek}
          onConfirm={onConfirmWaveSeek}
          onCancel={() => setPendingSeek(null)}
        />
      )}
    </div>
  );
}
