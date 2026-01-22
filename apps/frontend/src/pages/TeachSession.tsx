import { useEffect, useState } from "react";
import { useLiveSession } from "../session/useLiveSession";
import { useSpeechInput } from "../speech/useSpeechInput";
import { Waveform } from "../components/WaveForm";
import { WaveSeekConfirm } from "../components/WaveSeekConfirm";
import type { TeacherState } from "@shared/types";
import { useWaveform } from "../session/useWaveform";
import { useWaveSeek } from "../session/useWaveSeek";
import { SessionShell } from "../components/session/SessionShell";
import { TopBar } from "../components/session/TopBar";
import { StepsRail } from "../components/session/StepsRail";
import { ConversationPanel } from "../components/session/ConversationPanel";
import { QuickSettings } from "../components/session/QuickSettings";
import { InputBar } from "../components/session/InputBar";
import { useDebugState } from "../state/debugState";
import { useWebSocketState } from "../state/weSocketState";

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
  const { state: debugState } = useDebugState();
  const { reconnect } = useWebSocketState();

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
    liveAudio,
  } = useLiveSession();

  const { audioState, waveform, currentTimeMs, seekWithFadeMs, unlockAudio } = 
    liveAudio;

  const { startListening } = useSpeechInput(
    (text) => {
      if (isListening) {
        handleStudentSpeechFinal(text);
      } else {
        sendUserMessage(text);
      }
    },
    setIsListening
  );

  const stepTimeline = getStepTimeline();
  const activeStepId = stepTimeline.getActiveStepMonotonic(currentTimeMs);


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
  } = useWaveform(stepTimeline, equationSteps, currentTimeMs, aiLifecycleTick);

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
  const visibleSteps = equationSteps.filter(
    (step) => step.runId === currentProblemId
  );
  const connectionStatus = debugState.isReconnecting
    ? "reconnecting"
    : debugState.connected
    ? "connected"
    : "disconnected";

  useEffect(() => {
    return () => {
      if (seekToastTimeoutRef.current != null) {
        window.clearTimeout(seekToastTimeoutRef.current);
        seekToastTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    await unlockAudio();
    const message = input.trim();
    if (!message) return;
    sendUserMessage(message);
    setInput("");
  };

  const onStartListening = async () => {
    await unlockAudio();
    startListening();
  };

  return (
    <>
      <SessionShell
        topBar={
          <TopBar
            teacherState={teacherState}
            teacherLabel={TEACHER_LABEL[teacherState]}
            status={connectionStatus}
            onReconnect={reconnect}
            onStartNewProblem={startNewProblem}
          />
        }
        audioStrip={
          audioState === "playing" ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Teacher is speaking
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
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
              </div>
            </div>
          ) : null
        }
        stepsRail={
          <StepsRail
            steps={visibleSteps}
            activeStepId={activeStepId}
            previewStepId={previewStepId}
            hoverStepId={hoverStepId}
            animatedStepId={animatedStepId}
            pendingStepId={pendingSeek?.stepId}
            onReExplain={reExplainStep}
            onStepClick={(stepId, rect) => {
              const step = stepById.get(stepId);
              if (!step) return;
              if (activeStepId && stepId === activeStepId) {
                setPendingSeek(null);
                return;
              }
              const preferredX = rect.right + 12;
              const preferredY = rect.top + rect.height / 2;
              const x = Math.min(preferredX, window.innerWidth - 320);
              const y = Math.min(
                Math.max(preferredY, 80),
                window.innerHeight - 180,
              );
              handleSetPendingSeekByStep({
                stepId,
                clientX: x,
                clientY: y,
              });
            }}
          />
        }
        conversation={
          <ConversationPanel
            chat={chat}
            streamingText={streamingText}
            teacherState={teacherState}
            status={connectionStatus}
          />
        }
        quickSettings={<QuickSettings />}
        inputBar={
          <InputBar
            input={input}
            setInput={setInput}
            onSend={handleSend}
            isListening={isListening}
            onStartListening={onStartListening}
          />
        }
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
    </>
  );
}
