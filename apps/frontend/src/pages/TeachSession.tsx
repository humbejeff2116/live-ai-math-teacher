import { useEffect, useMemo, useRef, useState } from "react";
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
import { ConfusionConfirmToast } from "@/components/session/ConfusionConfirmationToast";
import { logEvent } from "../lib/debugTimeline";

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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confusionCooldownUntilMs, setConfusionCooldownUntilMs] = useState<
    number | null
  >(null);
  const [confusionPending, setConfusionPending] = useState<{
    offerId: string;
    choice: "hint" | "explain";
    startedAtMs: number;
  } | null>(null);
  const { state: debugState } = useDebugState();
  const { reconnect } = useWebSocketState();

  const waitingNudgeSentRef = useRef(false);
  const lastAudioStateRef = useRef<string | null>(null);

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
    lastAudioChunkAtMs,
    getWSCLient,
    teacherMeta,
    clearConfusionNudge,
  } = useLiveSession();

  const { audioState, waveform, currentTimeMs, seekWithFadeMs, unlockAudio } =
    liveAudio;
  const wsClient = getWSCLient();

  const { startListening, stopListening, micLevel, isUserSpeaking } =
    useSpeechInput(
      (text) => {
        if (isListening) handleStudentSpeechFinal(text);
        else sendUserMessage(text);
      },
      setIsListening,
      {
        getStepIdHint: () => activeStepId ?? null,
        sendConfusion: (payload) => {
          wsClient?.send({
            type: "confusion_signal",
            payload: {
              source: payload.source,
              reason: payload.reason,
              severity: payload.severity,
              text: payload.text,
              stepIdHint: payload.stepIdHint ?? null,
              observedAtMs: payload.observedAtMs,
            },
          });
        },
      },
    );

  const stepTimeline = getStepTimeline();
  const activeStepId = stepTimeline.getActiveStepMonotonic(currentTimeMs);
  const audioConnStatus = debugState.audioStatus; // "connecting" | "reconnecting" | "ready" | "closed" | undefined

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
    resumeFromStep,
  );

  const animatedStepId = hoverStepId ?? activeStepId ?? null;
  const confusionPendingStepId = teacherMeta.confusionNudge?.stepId;
  const confusionConfirmedStepIndex = debugState.confusionHandledStepIndex;
  const cooldownRemainingMs =
    confusionCooldownUntilMs != null
      ? Math.max(0, confusionCooldownUntilMs - nowMs)
      : 0;
  const showCooldownHint =
    cooldownRemainingMs > 0 && !teacherMeta.confusionNudge;
  const confusionReasonText = useMemo(() => {
    const n = teacherMeta.confusionNudge;
    if (!n) return null;
    switch (n.reason) {
      case "hesitation":
        return "Detected hesitation";
      case "pause":
        return "Long pause after explanation";
      case "wrong_answer":
        return "Answer didn't match the last step";
      case "repeat_request":
        return "Asked to repeat a step";
      case "general":
      default:
        if (n.source === "voice") return "Voice uncertainty";
        if (n.source === "text") return "Confusion in message";
        if (n.source === "video") return "Visual uncertainty detected";
        if (n.source === "system") return "Detected uncertainty";
        return null;
    }
  }, [teacherMeta.confusionNudge]);

  const hoverLabel = hoverStep
    ? `Step ${hoverStep.uiIndex} \u2013 ${hoverStep.type}`
    : null;

  const visibleSteps = equationSteps.filter(
    (step) => step.runId === currentProblemId,
  );
  const stepIndexById = useMemo(
    () =>
      Object.fromEntries(
        visibleSteps.map((step) => [step.id, step.uiIndex]),
      ),
    [visibleSteps],
  );

  const connectionStatus = debugState.isReconnecting
    ? "reconnecting"
    : debugState.connected
      ? "connected"
      : "disconnected";

  const expectsAudio =
    teacherState === "explaining" || teacherState === "re-explaining";

  const isAudioBuffering =
    expectsAudio &&
    (lastAudioChunkAtMs == null || nowMs - lastAudioChunkAtMs > 1500);

  useEffect(() => {
    if (lastAudioStateRef.current === audioState) return;
    if (audioState === "playing") logEvent("AudioPlay");
    if (audioState === "idle") logEvent("AudioPause");
    if (audioState === "interrupted") logEvent("AudioInterrupted");
    lastAudioStateRef.current = audioState;
  }, [audioState]);

  useEffect(() => {
    if (teacherState !== "waiting") waitingNudgeSentRef.current = false;
  }, [teacherState]);

  useEffect(() => {
    if (teacherMeta.confusionNudge) {
      setConfusionCooldownUntilMs(null);
    }
  }, [teacherMeta.confusionNudge]);

  useEffect(() => {
    if (teacherState !== "waiting") return;
    if (!teacherMeta.awaitingAnswerSinceMs) return;
    if (teacherMeta.confusionNudge) return;
    if (waitingNudgeSentRef.current) return;

    const t = window.setTimeout(() => {
      // mark immediately so we can't double-fire
      waitingNudgeSentRef.current = true;

      const observedAtMs = Date.now();
      const pauseDurationMs = teacherMeta.awaitingAnswerSinceMs
        ? observedAtMs - teacherMeta.awaitingAnswerSinceMs
        : undefined;
      logEvent("ConfusionSignal", {
        source: "system",
        reason: "pause",
        severity: "medium",
        durationMs: pauseDurationMs,
      });

      wsClient?.send({
        type: "confusion_signal",
        payload: {
          source: "system",
          reason: "pause",
          severity: "medium",
          text: "student_silent_after_question",
          stepIdHint: activeStepId ?? null,
          observedAtMs,
        },
      });
    }, 6500);

    return () => window.clearTimeout(t);
  }, [
    teacherState,
    activeStepId,
    wsClient,
    teacherMeta.awaitingAnswerSinceMs,
    teacherMeta.confusionNudge,
  ]);

  useEffect(() => {
    return () => {
      if (seekToastTimeoutRef.current != null) {
        window.clearTimeout(seekToastTimeoutRef.current);
        seekToastTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 300);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      teacherState === "thinking" ||
      teacherState === "explaining" ||
      teacherState === "re-explaining"
    ) {
      if (isListening) stopListening();
    }
  }, [teacherState, isListening, stopListening]);

  //Auto-clear pending as soon as teacher responds
  useEffect(() => {
    if (!confusionPending) return;

    // As soon as server starts responding, the UI should disappear cleanly
    if (
      teacherState === "thinking" ||
      teacherState === "explaining" ||
      teacherState === "re-explaining"
    ) {
      setConfusionPending(null);
      clearConfusionNudge();
    }
  }, [teacherState, confusionPending, clearConfusionNudge]);

  //unlock if server never responds
  // (Prevents “stuck disabled toast” on stale offer / network hiccup)
  useEffect(() => {
    if (!confusionPending) return;

    const t = window.setTimeout(() => {
      // If we’re still pending after 2.5s, re-enable UI.
      setConfusionPending(null);
    }, 2500);

    return () => window.clearTimeout(t);
  }, [confusionPending]);

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

  const handleStepClick = (stepId: string, rect: DOMRect) => {
    const step = stepById.get(stepId);
    if (!step) return;
    if (activeStepId && stepId === activeStepId) {
      setPendingSeek(null);
      return;
    }
    const preferredX = rect.right + 12;
    const preferredY = rect.top + rect.height / 2;
    const x = Math.min(preferredX, window.innerWidth - 320);
    const y = Math.min(Math.max(preferredY, 80), window.innerHeight - 180);
    handleSetPendingSeekByStep({
      stepId,
      clientX: x,
      clientY: y,
    });
  };

  const handleConfusionHint = () => {
    const n = teacherMeta.confusionNudge;
    if (!n) return;

    setConfusionPending({
      offerId: n.offerId,
      choice: "hint",
      startedAtMs: Date.now(),
    });

    logEvent("ConfusionConfirmed", {
      choice: "hint",
      step: n.stepIndex + 1,
      stepId: n.stepId,
    });

    wsClient?.send({
      type: "confusion_help_response",
      payload: {
        offerId: n.offerId,
        stepId: n.stepId,
        choice: "hint",
        atMs: Date.now(),
      },
    });
  };

  const handleConfusionExplain = () => {
    const n = teacherMeta.confusionNudge;
    if (!n) return;

    setConfusionPending({
      offerId: n.offerId,
      choice: "explain",
      startedAtMs: Date.now(),
    });

    logEvent("ConfusionConfirmed", {
      choice: "explain",
      step: n.stepIndex + 1,
      stepId: n.stepId,
    });

    wsClient?.send({
      type: "confusion_help_response",
      payload: {
        offerId: n.offerId,
        stepId: n.stepId,
        choice: "explain",
        atMs: Date.now(),
      },
    });
  };

  const handleDismissNudge = () => {
    const n = teacherMeta.confusionNudge;
    if (n) {
      wsClient?.send({
        type: "confusion_nudge_dismissed",
        payload: { stepId: n.stepId, atMs: Date.now() },
      });
    }
    setConfusionCooldownUntilMs(Date.now() + 25_000);
    setConfusionPending(null);
    clearConfusionNudge();
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
            audioBuffering={isAudioBuffering}
            audioConnStatus={audioConnStatus}
            audioConnReason={debugState.audioStatusReason ?? undefined}
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
                  stepIndexById={stepIndexById}
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
            teacherState={teacherState}
            audioState={audioState}
            confusionPendingStepId={confusionPendingStepId}
            confusionConfirmedStepIndex={confusionConfirmedStepIndex}
            onReExplain={reExplainStep}
            onStepClick={handleStepClick}
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
            isUserSpeaking={isUserSpeaking}
            micLevel={micLevel}
            onStartListening={onStartListening}
            onStopListening={stopListening}
          />
        }
      />

      {teacherMeta.confusionNudge && (
        <ConfusionConfirmToast
          stepIndex={teacherMeta.confusionNudge.stepIndex}
          onHint={handleConfusionHint}
          onExplain={handleConfusionExplain}
          onDismiss={handleDismissNudge}
          reasonText={confusionReasonText}
          reasonShownAtMs={teacherMeta.confusionNudge.atMs}
          pendingChoice={
            confusionPending?.offerId === teacherMeta.confusionNudge.offerId
              ? confusionPending.choice
              : null
          }
          autoHideMs={
            confusionPending?.offerId === teacherMeta.confusionNudge.offerId
              ? 9000 // give it longer while “working…”
              : undefined
          }
        />
      )}
      {showCooldownHint && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 69,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            color: "#94a3b8",
            background: "rgba(148,163,184,0.12)",
            border: "1px solid rgba(148,163,184,0.2)",
          }}
        >
          Nudge available in ~{Math.ceil(cooldownRemainingMs / 1000)}s
        </div>
      )}

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
