import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveSession } from "../session/useLiveSession";
import { useSpeechInput } from "../speech/useSpeechInput";
import { Waveform } from "../components/WaveForm";
import { WaveSeekConfirm } from "../components/WaveSeekConfirm";
import type { SilenceHelpChoice, TeacherState } from "@shared/types";
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
import {
  getDecision as getPersonalizationDecision,
  recordEvent as recordPersonalizationEvent,
} from "../personalization";
import { tagStepConcepts } from "../personalization/conceptTagger";
import { normalizeConceptIds } from "../personalization/conceptNormalization";
import { useSilenceNudgeScheduler } from "@/session/useSilenceNudgeScheduler";
import { SilenceConfirmToast } from "@/components/session/SilenceConfirmToast";

const TEACHER_LABEL: Record<TeacherState, string> = {
  idle: "Idle",
  thinking: "Thinking",
  explaining: "Explaining",
  "re-explaining": "Re-explaining",
  interrupted: "Interrupted",
  waiting: "Waiting",
};

export function TeachingSession() {
  const isDev = import.meta.env.MODE !== "production";
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
  const [reExplainStepId, setReExplainStepId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [demoNarrativeMode, setDemoNarrativeMode] = useState(
    () => isDev && import.meta.env.VITE_DEMO_NARRATIVE === "true",
  );
  const { state: debugState } = useDebugState();
  const { reconnect } = useWebSocketState();
  const lastAudioStateRef = useRef<string | null>(null);
  const confusionReExplainPendingRef = useRef<number | null>(null);
  const lastConfusionReExplainToastRef = useRef<number | null>(null);
  const actionToastTimeoutRef = useRef<number | null>(null);
  const actionToastCounterRef = useRef(0);
  const stepConfusedAtRef = useRef<Map<string, number>>(new Map());
  const reExplainDelayTimeoutRef = useRef<number | null>(null);
  const silenceHandlingDelayRef = useRef<number | null>(null);
  const activeSilenceOfferIdRef = useRef<string | null>(null);
  const SOFT_MEMORY_MS = 45_000;

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
    getAudioStepTimeline,
    startNewProblem,
    liveAudio,
    lastAudioChunkAtMs,
    getWSCLient,
    teacherMeta,
    clearConfusionNudge,
    clearSilenceNudge,
    // timelineTick,
  } = useLiveSession();

  const { 
    audioState, 
    waveform, 
    currentTimeMs, 
    seekWithFadeMs, 
    unlockAudio,
    play,
    pause,
    resume,
    replay,
    autoplayExplanations,
    setAutoplayExplanations,
    bufferedDurationMs,
  } = liveAudio;

  const wsClient = getWSCLient();

  const { 
    startListening, 
    stopListening, 
    micLevel, 
    isUserSpeaking 
  } = useSpeechInput((text) => {
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
  });

  const stepTimeline = getAudioStepTimeline();
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
  } = useWaveform(
    stepTimeline,
    equationSteps,
    currentTimeMs,
    aiLifecycleTick,
    // timelineTick,
  );

  const handleWaveSeekRequest = useCallback(
    (payload: { ms: number; clientX: number; clientY: number }) => {
      if (isDev) {
        console.log("[TeachingSession] onSeekRequest", payload);
      }
      handleOnseekRequest(payload);
    },
    [handleOnseekRequest, isDev],
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
    resumeFromStep,
  );

  // If the student starts typing, stop any “silence” nudging visuals immediately.
  const isTyping = input.trim().length > 0;
  const silenceNudge = teacherMeta.silenceNudge;
  const hasSilenceNudge = Boolean(silenceNudge);
  const animatedStepId = hoverStepId ?? activeStepId ?? null;
  const confusionPendingStepId = teacherMeta.confusionNudge?.stepId;
  const confusionConfirmedStepIndex = debugState.confusionHandledStepIndex;
  const cooldownRemainingMs =
    confusionCooldownUntilMs != null
      ? Math.max(0, confusionCooldownUntilMs - nowMs)
      : 0;
  const showCooldownHint =
    cooldownRemainingMs > 0 && !teacherMeta.confusionNudge;
  const showConfusionIdleHint =
    !teacherMeta.confusionNudge && !confusionPending && !showCooldownHint;
  const isDemoNarrative = isDev && demoNarrativeMode;
  const waitingAgeMs =
    teacherState === "waiting" && teacherMeta.awaitingAnswerSinceMs != null
      ? Math.max(0, nowMs - teacherMeta.awaitingAnswerSinceMs)
      : null;
  const confusionReasonText = useMemo(() => {
    const n = teacherMeta.confusionNudge;
    if (!n) return null;
    switch (n.reason) {
      case "hesitation":
        return "Detected hesitation";
      case "pause": {
        if (n.source === "system" && n.severity === "low")
          return "Waiting for your reply";
        return "Long pause after explanation";
      }
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

  const showAudioStrip =
    expectsAudio ||
    waveform.length > 0 ||
    ["buffering", "ready", "playing", "paused", "ended"].includes(audioState);

  const audioStatusLabel =
    audioState === "buffering"
      ? "Buffering\u2026"
      : audioState === "ready"
      ? "Ready"
      : audioState === "playing"
      ? "Playing"
      : audioState === "paused"
      ? "Paused"
      : audioState === "ended"
      ? "Ended"
      : "Idle";

  const showPlayButton = ["buffering", "ready", "paused", "ended"].includes(
    audioState,
  );
  const showPauseButton = audioState === "playing";
  const showReplayButton = ["ended", "paused", "ready"].includes(audioState);

  const timelineTotal = stepTimeline?.getTotalDurationMs() ?? 0;
  // If timelineTotal looks like seconds (small number), convert.
  // Heuristic: anything > 0 and < 1000 is probably seconds, not ms.
  const timelineTotalMs =
    timelineTotal > 0 && timelineTotal < 1000
      ? timelineTotal * 1000
      : timelineTotal;
  // Use the best available ms duration.
  const waveformDurationMs = Math.max(timelineTotalMs, bufferedDurationMs, 0);



  
  const lastVisibleStepId =
    visibleSteps.length > 0
      ? visibleSteps[visibleSteps.length - 1]!.id
      : null;

  const silenceStepIdHint = activeStepId ?? lastVisibleStepId ?? null;

  const silenceNudgeEnabled =
    (teacherState === "waiting" &&
      audioState !== "playing" &&
      audioState === "idle") 
      
      ||
    (audioState === "ended" &&
      !isUserSpeaking &&
      !confusionPending &&
      !showCooldownHint &&
      !hasSilenceNudge &&
      waitingAgeMs != null &&
      waitingAgeMs > 7000 &&
      (silenceNudge == null ||
        (silenceNudge && nowMs - silenceNudge.atMs > 15000))); // at least 15s since last offer

  useSilenceNudgeScheduler({
    enabled: silenceNudgeEnabled,
    awaitingAnswerSinceMs: teacherMeta.awaitingAnswerSinceMs,
    hasSilenceNudge,
    isTyping,
    wsClient,
    stepIdHint: silenceStepIdHint,
    delayMs: 6500,
    isDev,
  });


  // if user starts typing while silence toast is visible => dismiss + cooldown server-side
  useEffect(() => {
    if (!silenceNudge) return;
    if (!isTyping) return;

    if (silenceHandlingDelayRef.current != null) {
      window.clearTimeout(silenceHandlingDelayRef.current);
      silenceHandlingDelayRef.current = null;
    }

    wsClient?.send({
      type: "silence_nudge_dismissed",
      payload: { offerId: silenceNudge.offerId, atMs: Date.now() },
    });
    clearSilenceNudge();
  }, [clearSilenceNudge, isTyping, silenceNudge, wsClient]);

  useEffect(() => {
    if (lastAudioStateRef.current === audioState) return;
    if (audioState === "playing") logEvent("AudioPlay");
    if (audioState === "paused" || audioState === "ended")
      logEvent("AudioPause");
    if (audioState === "interrupted") logEvent("AudioInterrupted");
    lastAudioStateRef.current = audioState;
  }, [audioState]);

  useEffect(() => {
    if (!isDev) return;
    console.warn(
      "[TeachSession.waveform.length]",
      { length: waveform.length, audioState, currentProblemId },
      new Error().stack,
    );
  }, [audioState, currentProblemId, isDev, waveform.length]);

  const isStepRecentlyConfused = useCallback((stepId: string) => {
    const lastConfusedAt = stepConfusedAtRef.current.get(stepId);
    return (
      lastConfusedAt != null && Date.now() - lastConfusedAt < SOFT_MEMORY_MS
    );
  }, []);

  const markStepConfused = useCallback((stepId: string) => {
    stepConfusedAtRef.current.set(stepId, Date.now());
  }, []);

  const sendWithReExplainDelay = useCallback(
    (sendFn: () => void) => {
      if (!isDemoNarrative) {
        sendFn();
        return;
      }
      if (reExplainDelayTimeoutRef.current != null) {
        window.clearTimeout(reExplainDelayTimeoutRef.current);
      }
      reExplainDelayTimeoutRef.current = window.setTimeout(() => {
        reExplainDelayTimeoutRef.current = null;
        sendFn();
      }, 450);
    },
    [isDemoNarrative],
  );

  const sendWithSilenceHandlingDelay = useCallback(
    (sendFn: () => void) => {
      if (!isDemoNarrative) {
        sendFn();
        return;
      }
      if (silenceHandlingDelayRef.current != null) {
        window.clearTimeout(silenceHandlingDelayRef.current);
      }
      silenceHandlingDelayRef.current = window.setTimeout(() => {
        silenceHandlingDelayRef.current = null;
        sendFn();
      }, 450);
    },
    [isDemoNarrative],
  );

  useEffect(() => {
    const nudge = teacherMeta.confusionNudge;
    if (!nudge) return;
    if (!isStepRecentlyConfused(nudge.stepId)) return;
    clearConfusionNudge();
    wsClient?.send({
      type: "confusion_nudge_dismissed",
      payload: { stepId: nudge.stepId, atMs: Date.now() },
    });
    const stepForTagging = stepById.get(nudge.stepId);
    const tagResult = stepForTagging
      ? tagStepConcepts(stepForTagging.text)
      : null;
    const stepType =
      tagResult?.stepType && tagResult.stepType !== "other"
        ? tagResult.stepType
        : stepForTagging?.type;
    const conceptIds = tagResult
      ? normalizeConceptIds(tagResult.conceptIds)
      : [];
    recordPersonalizationEvent({
      type: "nudge_dismissed",
      stepId: nudge.stepId,
      stepType,
      conceptIds: conceptIds.length > 0 ? conceptIds : undefined,
      reason: nudge.reason,
      atMs: Date.now(),
    });
  }, [
    teacherMeta.confusionNudge,
    clearConfusionNudge,
    isStepRecentlyConfused,
    wsClient,
    stepById,
  ]);

  useEffect(() => {
    return () => {
      if (seekToastTimeoutRef.current != null) {
        window.clearTimeout(seekToastTimeoutRef.current);
        seekToastTimeoutRef.current = null;
      }
      if (actionToastTimeoutRef.current != null) {
        window.clearTimeout(actionToastTimeoutRef.current);
        actionToastTimeoutRef.current = null;
      }
      if (reExplainDelayTimeoutRef.current != null) {
        window.clearTimeout(reExplainDelayTimeoutRef.current);
        reExplainDelayTimeoutRef.current = null;
      }
      if (silenceHandlingDelayRef.current != null) {
        window.clearTimeout(silenceHandlingDelayRef.current);
        silenceHandlingDelayRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 300);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isDev) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey) return;
      if (event.key.toLowerCase() !== "n") return;
      event.preventDefault();
      setDemoNarrativeMode((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDev]);

  const showActionToast = useCallback((message: string) => {
    const toastId = (actionToastCounterRef.current += 1);
    setActionToast({ id: toastId, message });
    if (actionToastTimeoutRef.current != null) {
      window.clearTimeout(actionToastTimeoutRef.current);
    }
    actionToastTimeoutRef.current = window.setTimeout(() => {
      setActionToast((prev) => (prev?.id === toastId ? null : prev));
    }, 1600);
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

  useEffect(() => {
    const reexplainedIndex = debugState.reexplainedStepIndex;
    if (reexplainedIndex == null) return;
    if (confusionReExplainPendingRef.current == null) return;
    if (confusionReExplainPendingRef.current !== reexplainedIndex) return;
    if (lastConfusionReExplainToastRef.current === reexplainedIndex) return;

    showActionToast("Got it — continuing.");
    lastConfusionReExplainToastRef.current = reexplainedIndex;
    confusionReExplainPendingRef.current = null;
  }, [debugState.reexplainedStepIndex, showActionToast]);

  useEffect(() => {
    if (teacherState !== "re-explaining") {
      setReExplainStepId(null);
    }
  }, [teacherState]);

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

  //clear only the one we saw when the state changed
  useEffect(() => {
    activeSilenceOfferIdRef.current = silenceNudge?.offerId ?? null;
  }, [silenceNudge?.offerId]);

  useEffect(() => {
    if (!silenceNudge) return;
    if (
      teacherState === "thinking" ||
      teacherState === "explaining" ||
      teacherState === "re-explaining"
    ) {
      // only clear if we’re clearing the same offer
      if (activeSilenceOfferIdRef.current === silenceNudge.offerId) {
        clearSilenceNudge();
      }
    }
  }, [teacherState, silenceNudge, clearSilenceNudge]);

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


  useEffect(() => {
    console.log("[Waveform]", {
      audioState,
      waveformLen: waveform.length,
      bufferedDurationMs,
      waveformDurationMs,
    });

  }, [audioState, waveform.length, bufferedDurationMs, waveformDurationMs, currentTimeMs]);


  const handleSend = async () => {
    if (isDev) {
      console.log("[TeachingSession] handleSend", {
        atMs: Date.now(),
        teacherState,
        audioState,
        wsConnected: debugState.connected,
        audioConnStatus,
      });
    }
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
    markStepConfused(n.stepId);
    const stepForTagging = stepById.get(n.stepId);
    const tagResult = stepForTagging
      ? tagStepConcepts(stepForTagging.text)
      : null;
    const stepType =
      tagResult?.stepType && tagResult.stepType !== "other"
        ? tagResult.stepType
        : stepForTagging?.type;
    const conceptIds = tagResult
      ? normalizeConceptIds(tagResult.conceptIds)
      : [];
    recordPersonalizationEvent({
      type: "confusion_confirmed",
      stepId: n.stepId,
      stepType,
      conceptIds: conceptIds.length > 0 ? conceptIds : undefined,
      reason: n.reason,
      atMs: Date.now(),
    });

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
    const stepForTagging = stepById.get(n.stepId);
    const tagResult = stepForTagging
      ? tagStepConcepts(stepForTagging.text)
      : null;
    const stepType =
      tagResult?.stepType && tagResult.stepType !== "other"
        ? tagResult.stepType
        : stepForTagging?.type;
    const conceptIds = tagResult
      ? normalizeConceptIds(tagResult.conceptIds)
      : [];
    recordPersonalizationEvent({
      type: "confusion_confirmed",
      stepId: n.stepId,
      stepType,
      conceptIds: conceptIds.length > 0 ? conceptIds : undefined,
      reason: n.reason,
      atMs: Date.now(),
    });
    setReExplainStepId(n.stepId);
    confusionReExplainPendingRef.current = n.stepIndex;
    markStepConfused(n.stepId);

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

    sendWithReExplainDelay(() => {
      wsClient?.send({
        type: "confusion_help_response",
        payload: {
          offerId: n.offerId,
          stepId: n.stepId,
          choice: "explain",
          atMs: Date.now(),
        },
      });
    });
  };

  const handleReExplain = (
    stepId: string,
    style?: "simpler" | "visual" | "example",
  ) => {
    setReExplainStepId(stepId);
    sendWithReExplainDelay(() => reExplainStep(stepId, style));
  };

  const toastToShow = actionToast ?? seekToast;
  const nudgeAutoHideMs =
    confusionPending?.offerId === teacherMeta.confusionNudge?.offerId
      ? isDemoNarrative
        ? 11000
        : 9000 // give it longer while â€œworkingâ€¦â€
      : isDemoNarrative
        ? 8000
        : undefined;

  const handleDismissNudge = () => {
    const n = teacherMeta.confusionNudge;
    if (n) {
      wsClient?.send({
        type: "confusion_nudge_dismissed",
        payload: { stepId: n.stepId, atMs: Date.now() },
      });
      const stepForTagging = stepById.get(n.stepId);
      const tagResult = stepForTagging
        ? tagStepConcepts(stepForTagging.text)
        : null;
      const stepType =
        tagResult?.stepType && tagResult.stepType !== "other"
          ? tagResult.stepType
          : stepForTagging?.type;
      const conceptIds = tagResult
        ? normalizeConceptIds(tagResult.conceptIds)
        : [];
      recordPersonalizationEvent({
        type: "nudge_dismissed",
        stepId: n.stepId,
        stepType,
        conceptIds: conceptIds.length > 0 ? conceptIds : undefined,
        reason: n.reason,
        atMs: Date.now(),
      });
      recordPersonalizationEvent({
        type: "confusion_dismissed",
        stepId: n.stepId,
        stepType,
        conceptIds: conceptIds.length > 0 ? conceptIds : undefined,
        reason: n.reason,
        atMs: Date.now(),
      });
    }
    const decision = getPersonalizationDecision();
    const seconds = decision.nudgePolicy.minSecondsBetweenNudges;
    const boundedSeconds = Math.max(25, Math.min(60, seconds));
    setConfusionCooldownUntilMs(Date.now() + boundedSeconds * 1000);
    setConfusionPending(null);
    clearConfusionNudge();
  };

  const handleDismissSilence = () => {
    if (!silenceNudge) return;

    if (silenceHandlingDelayRef.current != null) {
      window.clearTimeout(silenceHandlingDelayRef.current);
      silenceHandlingDelayRef.current = null;
    }

    wsClient?.send({
      type: "silence_nudge_dismissed",
      payload: { offerId: silenceNudge.offerId, atMs: Date.now() },
    });
    clearSilenceNudge();
  };


  const handleSilenceAction = useCallback(
    (choice: SilenceHelpChoice) => {
      if (!silenceNudge) return;

      const offerId = silenceNudge.offerId; // capture now
      const atMs = Date.now();

      sendWithSilenceHandlingDelay(() => {
        wsClient?.send({
          type: "silence_help_response",
          payload: { offerId, choice, atMs },
        });
      });
    },
    [silenceNudge, sendWithSilenceHandlingDelay, wsClient],
  );

  return (
    <>
      {isDev && teacherState === "waiting" && (
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 60,
            zIndex: 70,
            fontSize: 11,
            color: "#475569",
            background: "rgba(248,250,252,0.92)",
            border: "1px solid rgba(148,163,184,0.4)",
            padding: "4px 8px",
            borderRadius: 8,
            boxShadow: "0 4px 10px rgba(15, 23, 42, 0.08)",
          }}
        >
          waitingAgeMs: {waitingAgeMs ?? "n/a"} | awaitingAnswerSinceMs:{" "}
          {teacherMeta.awaitingAnswerSinceMs ?? "n/a"} | hasSilenceNudge:{" "}
          {hasSilenceNudge ? "yes" : "no"} | isTyping:{" "}
          {isTyping ? "yes" : "no"}
        </div>
      )}
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
          showAudioStrip ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Teacher audio</span>
                {autoplayExplanations && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                    Autoplay is on
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                  {audioStatusLabel}
                </span>
                {showPlayButton && (
                  <button
                    type="button"
                    onClick={() => {
                      if (audioState === "paused") {
                        resume();
                      } else {
                        play();
                      }
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Play
                  </button>
                )}
                {showPauseButton && (
                  <button
                    type="button"
                    onClick={() => pause()}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Pause
                  </button>
                )}
                {showReplayButton && (
                  <button
                    type="button"
                    onClick={() => replay()}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Replay
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <Waveform
                  waveform={waveform}
                  stepRanges={stepTimeline?.getRanges() || []}
                  stepIndexById={stepIndexById}
                  durationMs={waveformDurationMs}
                  currentTimeMs={currentTimeMs}
                  animatedStepId={animatedStepId}
                  hoverLabel={hoverLabel}
                  hoverMs={hoverMs}
                  onHoverTime={setHoverMs}
                  onSeekRequest={handleWaveSeekRequest}
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
            onReExplain={handleReExplain}
            onStepClick={handleStepClick}
            reExplainStepId={reExplainStepId}
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
        quickSettings={
          <QuickSettings
            autoplay={autoplayExplanations}
            onToggleAutoplay={setAutoplayExplanations}
          />
        }
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
            showSilencePulse={hasSilenceNudge && !isTyping}
          />
        }
      />

      {silenceNudge && (
        <SilenceConfirmToast
          stepIndex={silenceNudge.stepIndex}
          onDismiss={handleDismissSilence}
          onRepeatQuestion={() => handleSilenceAction("repeat_question")}
          onGiveHint={() => handleSilenceAction("give_hint")}
          onImStuck={() => handleSilenceAction("im_stuck")}
        />
      )}

      {teacherMeta.confusionNudge && (
        <ConfusionConfirmToast
          stepIndex={teacherMeta.confusionNudge.stepIndex}
          onHint={handleConfusionHint}
          onExplain={handleConfusionExplain}
          onDismiss={handleDismissNudge}
          reasonText={confusionReasonText}
          reasonShownAtMs={teacherMeta.confusionNudge.atMs}
          alwaysShowReason={isDemoNarrative}
          pendingChoice={
            confusionPending?.offerId === teacherMeta.confusionNudge.offerId
              ? confusionPending.choice
              : null
          }
          autoHideMs={nudgeAutoHideMs}
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
      {showConfusionIdleHint && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 68,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            color: "#94a3b8",
            background: "rgba(148,163,184,0.08)",
            border: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          I'll jump in if anything feels unclear.
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

      {toastToShow && (
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
          {toastToShow?.message}
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
