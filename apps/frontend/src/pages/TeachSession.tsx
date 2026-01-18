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
    chat,
    streamingText,
    equationSteps,
    currentProblemId,
    sendUserMessage,
    handleStudentSpeechFinal,
    reExplainStep,
    teacherState,
    resumeFromStep,
    aiLifecycleTick,
    getStepTimeline,
    startNewProblem,
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
    handleSetPendingSeekByStep,
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
    ? `Step ${hoverStep.uiIndex} \u2013 ${hoverStep.type}`
    : null;
  const visibleSteps = equationSteps.filter((step) => step.runId === currentProblemId);

  useEffect(() => {
    return () => {
      if (seekToastTimeoutRef.current != null) {
        window.clearTimeout(seekToastTimeoutRef.current);
        seekToastTimeoutRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24 }}>
      {/* <h2>Live AI Math Teacher</h2> */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Live AI Math Teacher</h2>
        <button
          onClick={startNewProblem}
          style={{
            marginLeft: "1rem",
            background: "#ef4444",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Clear & New Problem
        </button>
      </div>
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
        {chat.length > 0 && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {chat.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf:
                    message.role === "student" ? "flex-end" : "flex-start",
                  textAlign: message.role === "student" ? "right" : "left",
                  maxWidth: "75%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background:
                    message.role === "student"
                      ? "rgba(37, 99, 235, 0.12)"
                      : "rgba(15, 23, 42, 0.06)",
                  border:
                    message.role === "student"
                      ? "1px solid rgba(37, 99, 235, 0.25)"
                      : "1px solid rgba(15, 23, 42, 0.12)",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                }}
              >
                {message.text}
              </div>
            ))}
          </div>
        )}
        {visibleSteps && (
          <EquationSteps
            steps={visibleSteps}
            activeStepId={activeStepId}
            onReExplain={reExplainStep}
            previewStepId={previewStepId}
            hoverStepId={hoverStepId}
            animatedStepId={animatedStepId}
            pendingStepId={pendingSeek?.stepId}
            pendingStepLabel={pendingSeek ? "Resume here?" : undefined}
            onStepClick={(stepId) => {
              const step = stepById.get(stepId);
              if (!step) return;
              if (activeStepId && stepId === activeStepId) {
                setPendingSeek(null);
                return;
              }
              handleSetPendingSeekByStep({
                stepId,
                clientX: window.innerWidth - 260,
                clientY: 120,
              });
            }}
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

      {isConfirmingSeek && (
        <div
          style={{
            position: "fixed",
            top: 44,
            right: 12,
            zIndex: 61,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            background: "rgba(15, 23, 42, 0.06)",
            color: "#0f172a",
            border: "1px solid rgba(15, 23, 42, 0.12)",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.1)",
            transition: "opacity 160ms ease",
            pointerEvents: "none",
          }}
        >
          Resuming...
        </div>
      )}

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
