import { useCallback, useEffect, useRef, useState } from "react";
import { useDebugState } from "../state/debugState";
import type {
  EquationStep,
  ResumeFromStepSource,
  ServerToClientMessage,
} from "@shared/types";
import { useTTS } from "../textToSpeech/useTTS";
import { useLiveAudio } from "../audio/useLiveAudio";
import { useWebSocketState } from "../state/weSocketState";
import { useTeacherState } from "./useTeacherState";
import { AudioStepTimeline } from "../audio/audioStepTimeLine";
import { classifyConfusion } from "./session.utils";
import { logEvent } from "../lib/debugTimeline";
import {
  getDecision as getPersonalizationDecision,
  recordEvent as recordPersonalizationEvent,
} from "../personalization";

export function useLiveSession() {
  const sendTimeRef = useRef<number | null>(null);
  const { wsClientRef, subscribe } = useWebSocketState();
  const lastStepIndexRef = useRef<number | null>(null);
  const stepTimelineRef = useRef(new AudioStepTimeline({ sampleRate: 24000 }));


  const liveAudio = useLiveAudio(stepTimelineRef);

  const {
    chat,
    streamingText,
    equationSteps,
    currentProblemId,
    teacherState,
    teacherMeta,
    resetTeacher,
    aiLifecycleTick,
    lastAudioChunkAtMs,
    currentProblemIdRef,
    setProblemId,
    setChat,
    setEquationSteps,
    handleMessage,
    appendStudentMessage,
    resetDebugForNewProblem,
    maybeStartNewProblemFromStudentText,
    clearConfusionNudge,
  } = useHandleMessage(
    stepTimelineRef,
    sendTimeRef,
    lastStepIndexRef,
    liveAudio.playChunk,
  );

  const { setPlaybackRate } = liveAudio;

  

  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      handleMessage(msg);
    });
    return unsubscribe;
  }, [subscribe, handleMessage]);

  useEffect(() => {
    if (teacherState !== "re-explaining") {
      setPlaybackRate(1);
      return;
    }
    const decision = getPersonalizationDecision();
    const pace = decision.settings.pace;
    const targetRate = pace === "slow" ? 0.95 : 1;
    setPlaybackRate(targetRate);
  }, [setPlaybackRate, teacherState]);

  // 3. Cleanup logic: Stop audio/timers when the hook unmounts
  useEffect(() => {
    const timeline = stepTimelineRef.current;

    return () => {
      timeline.destroy?.();
      console.log("Live session cleaned up.");
    };
  }, []);

    const startNewProblem = useCallback(() => {
      setProblemId(currentProblemIdRef.current + 1, "manual_start_new_problem");

      // Clear the chat and steps locally
      setChat([]);
      setEquationSteps([]);
      // Reset audio UX indicators
      resetDebugForNewProblem()

      // Inform the server to reset its internal step tracker
      wsClientRef.current?.send({
        type: "reset_session", // You'll need to handle this type on the server
      });
    }, [currentProblemIdRef, resetDebugForNewProblem, setChat, setEquationSteps, setProblemId, wsClientRef]);
  

  function sendUserMessage(text: string) {
    sendTimeRef.current = Date.now();
    appendStudentMessage(text);
    maybeStartNewProblemFromStudentText(text);
    const lower = text.toLowerCase();

    if (
      lower.includes("confuse") ||
      lower.includes("don't understand") ||
      lower.includes("dont get") ||
      lower.includes("lost") ||
      lower.includes("doesn't make sense")
    ) {
      const observedAtMs = Date.now();
      const stepIdHint =
        stepTimelineRef.current.getActiveStepMonotonic(liveAudio.currentTimeMs) ??
        null;
      const { reason, severity } = classifyConfusion(text);
      logEvent("ConfusionSignal", {
        source: "text",
        reason,
        severity,
        stepId: stepIdHint ?? undefined,
      });
      wsClientRef.current?.send({
        type: "confusion_signal",
        payload: {
          source: "text",
          reason,
          severity,
          text,
          stepIdHint: stepIdHint,
          observedAtMs: observedAtMs,
        },
      });
      return;
    }

    if (
      lower.includes("step") ||
      lower.includes("last") ||
      lower.includes("simplify") ||
      lower.includes("that equation")
    ) {
      wsClientRef.current?.send({
        type: "select_step_nl",
        payload: { text },
      });
      return;
    }

    wsClientRef.current?.send({
      type: "user_message",
      payload: { text },
    });
  }

  function handleStudentSpeechFinal(text: string) {
    wsClientRef.current?.send({
      type: "resume_request",
      payload: {
        studentUtterance: text,
        lastKnownStepIndex: lastStepIndexRef.current,
      },
    });
  }

  function reExplainStep(
    stepId: string,
    style: "simpler" | "visual" | "example" = "simpler"
  ) {
    wsClientRef.current?.send({
      type: "reexplain_step",
      payload: { stepId, style },
    });
  }

  function resumeFromStep(stepId: string) {
    wsClientRef.current?.send({
      type: "resume_from_step",
      payload: {
        stepId,
        source: "waveform" as ResumeFromStepSource,
      },
    });
  }
  

  return {
    chat,
    streamingText,
    equationSteps,
    currentProblemId,
    sendUserMessage,
    handleStudentSpeechFinal,
    reExplainStep,
    teacherState,
    teacherMeta,
    resetTeacher,
    resumeFromStep,
    aiLifecycleTick,
    getStepTimeline: () => stepTimelineRef.current,
    getWSCLient: () => wsClientRef.current,
    startNewProblem,
    liveAudio,
    lastAudioChunkAtMs,
    clearConfusionNudge,
  };
}

export type AudioStepStatus = "pending" | "buffering" | "ready";
const AUDIO_READY: AudioStepStatus = "ready" as const;
const AUDIO_PENDING: AudioStepStatus = "pending" as const;
const AUDIO_BUFFERING: AudioStepStatus = "buffering" as const;
export type UIEquationStep = EquationStep & {
  uiIndex: number;
  runId: number;
  audioStatus: AudioStepStatus;
  audioPendingAtMs: number;
};
export type ChatMessage = {
  id: string;
  role: "student" | "teacher";
  text: string;
  createdAtMs: number;
};

export function useHandleMessage(
  stepTimelineRef: React.RefObject<AudioStepTimeline>,
  sendTimeRef: React.RefObject<number | null>,
  lastStepIndexRef: React.RefObject<number | null>,
  playChunk: (b64: string, stepId?: string, mimeType?: string) => void,
) {
  const DEBUG_EQUATION_STEPS = true;
  const stepIndexByIdRef = useRef(new Map<string, number>());
  const lastTeacherSignalRef = useRef<string | null>(null);
  const lastReexplainStepIdRef = useRef<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [equationSteps, setEquationSteps] = useState<UIEquationStep[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [aiLifecycleTick, setAiLifecycleTick] = useState(0);
  const [currentProblemId, setCurrentProblemId] = useState(0);
  const [lastAudioChunkAtMs, setLastAudioChunkAtMs] = useState<number | null>(
    null,
  );
  const { setState: setDebugState } = useDebugState();
  const bufferRef = useRef("");
  const currentProblemIdRef = useRef(0);
  const { interrupt: interruptTTS } = useTTS();

  const {
    teacherState,
    teacherMeta,
    dispatchTeacher,
    markTeacherUtteranceFinal,
    resetTeacher,
    clearConfusionNudge,
  } = useTeacherState();

  const setProblemId = useCallback(
    (nextId: number, reason: string) => {
      currentProblemIdRef.current = nextId;
      setCurrentProblemId(nextId);
      if (DEBUG_EQUATION_STEPS) {
        console.log("[problem_id]", { nextId, reason });
      }
    },
    [DEBUG_EQUATION_STEPS, setCurrentProblemId],
  );

  const appendStudentMessage = useCallback((text: string) => {
    const createdAtMs = Date.now();
    setChat((prev) => [
      ...prev,
      {
        id: `student-${createdAtMs}-${prev.length}`,
        role: "student",
        text,
        createdAtMs,
      },
    ]);
  }, []);

  const resetDebugForNewProblem = useCallback(() => {
    setLastAudioChunkAtMs(null);
    setDebugState((s) => ({
      ...s,
      lastLatencyMs: undefined,
      audioStatus: undefined,
      audioStatusReason: null,
      audioStatusAtMs: undefined,
    }));
  }, [setDebugState]);

  const maybeStartNewProblemFromStudentText = useCallback(
    (text: string) => {
      const trimmed = text.toLowerCase().trim();
      // Only trigger if it looks like a command AND contains an equation
      const isCommand =
        trimmed.startsWith("solve") || trimmed.startsWith("calculate");
      const hasEquation = trimmed.includes("=");

      if (isCommand && hasEquation) {
        setProblemId(currentProblemIdRef.current + 1, "auto_detect");
      }
    },
    [currentProblemIdRef, setProblemId],
  );

  const resolveStepIdFromIndex = useCallback((index?: number | null) => {
    if (index == null) return null;
    for (const [stepId, stepIndex] of stepIndexByIdRef.current.entries()) {
      if (stepIndex === index) return stepId;
    }
    return null;
  }, []);

  const handleMessage = useCallback(
    (message: ServerToClientMessage) => {
      const updateLatencyOnce = () => {
        setDebugState((s) => {
          if (s.lastLatencyMs != null) return s;
          return {
            ...s,
            lastLatencyMs: sendTimeRef.current
              ? Date.now() - sendTimeRef.current
              : undefined,
          };
        });
      };

      updateLatencyOnce();

      if (message.type === "teacher_reexplaining") {
        logEvent("ReexplainStarted", {
          step: message.stepIndex != null ? message.stepIndex + 1 : undefined,
        });
        const stepId = resolveStepIdFromIndex(message.stepIndex);
        lastReexplainStepIdRef.current = stepId;
        if (stepId) {
          recordPersonalizationEvent({
            type: "reexplain_started",
            stepId,
            atMs: Date.now(),
          });
        }
        lastTeacherSignalRef.current = "re-explaining";
      } else if (message.type === "teacher_waiting") {
        if (lastTeacherSignalRef.current === "re-explaining") {
          logEvent("ReexplainEnded");
          const stepId = lastReexplainStepIdRef.current;
          if (stepId) {
            recordPersonalizationEvent({
              type: "reexplain_completed",
              stepId,
              atMs: Date.now(),
            });
          }
        }
        lastTeacherSignalRef.current = "waiting";
      } else if (message.type === "teacher_explaining") {
        lastTeacherSignalRef.current = "explaining";
      } else if (message.type === "teacher_thinking") {
        lastTeacherSignalRef.current = "thinking";
      } else if (message.type === "teacher_interrupted") {
        lastTeacherSignalRef.current = "interrupted";
      }

      dispatchTeacher(message);

      if (message.type === "audio_status") {
        setDebugState((s) => ({
          ...s,
          audioStatus: message.payload.status,
          audioStatusReason: message.payload.reason ?? null,
          audioStatusAtMs: message.payload.atMs,
        }));
        // if reconnecting/connecting, clear lastAudioChunkAtMs so buffering pill appears
        if (message.payload.status !== "ready") setLastAudioChunkAtMs(null);
      }

      if (message.type === "ai_reexplained") {
        setDebugState((s) => ({
          ...s,
          reexplainedStepIndex: message.payload.reexplainedStepIndex,
        }));
      }

      if (message.type === "ai_confusion_handled") {
        setDebugState((s) => ({
          ...s,
          confusionCount: (s.confusionCount ?? 0) + 1,
          confusionHandledStepIndex: message.payload.confusionHandledStepIndex,
        }));
      }
      //Keep them (step_audio_start / step_audio_end) for debugging if you want,
      // but don't rely on them for active step.
      //they can create overlapping ranges if mixed.
      if (message.type === "step_audio_start") {
        stepTimelineRef.current.onStepStart(
          message.payload.stepId,
          message.payload.atMs,
        );
        const stepIndex = stepIndexByIdRef.current.get(
          message.payload.stepId,
        );
        logEvent("StepStarted", {
          step: stepIndex != null ? stepIndex + 1 : undefined,
          stepId: message.payload.stepId,
        });
      }

      if (message.type === "step_audio_end") {
        stepTimelineRef.current.onStepEnd(
          message.payload.stepId,
          message.payload.atMs,
        );
      }

      if (message.type === "ai_resumed") {
        setStreamingText("");
        setAiLifecycleTick((t) => t + 1);
      }

      if (message.type === "equation_step") {
        lastStepIndexRef.current = message.payload.index;
        stepIndexByIdRef.current.set(message.payload.id, message.payload.index);

        setEquationSteps((prev) => {
          const runId = currentProblemIdRef.current;
          if (DEBUG_EQUATION_STEPS) {
            console.log("[equation_step recv]", {
              id: message.payload.id,
              index: message.payload.index,
              equation: message.payload.equation,
              runId,
            });
          }
          const alreadyInRun = prev.filter((s) => s.runId === runId);
          const exists = alreadyInRun.some((s) => s.id === message.payload.id);
          if (exists) return prev;
          const normalizeEquation = (equation: string) =>
            equation.replace(/\s+/g, " ").trim();
          const lastStep = alreadyInRun[alreadyInRun.length - 1];
          if (
            lastStep &&
            normalizeEquation(lastStep.equation) ===
              normalizeEquation(message.payload.equation)
          ) {
            return prev;
          }
          const uiIndex = alreadyInRun.length + 1;
          return [
            ...prev,
            {
              ...message.payload,
              runId,
              uiIndex,
              audioStatus: AUDIO_PENDING,
              audioPendingAtMs: Date.now(),
            },
          ];
        });

        setDebugState((s) => ({
          ...s,
          lastEquationStep: message.payload,
        }));
      }

      if (message.type === "ai_interrupted") {
        interruptTTS();
        setAiLifecycleTick((t) => t + 1);

        setDebugState((s) => ({
          ...s,
          interruptedCount: s.interruptedCount + 1,
        }));
      }

      if (message.type === "ai_audio_chunk") {
        const { stepId, audioBase64, audioMimeType } = message.payload;
        const isFreeform = stepId.startsWith("__freeform__");

        setLastAudioChunkAtMs(Date.now());

        // Only mark equation steps "ready" for non-freeform
        if (!isFreeform) {
          setEquationSteps((prev) => {
            let changed = false;
            const next = prev.map((step) => {
              if (step.id !== stepId) return step;
              if (step.audioStatus === "ready") return step;
              changed = true;
              return { ...step, audioStatus: AUDIO_READY };
            });
            return changed ? next : prev;
          });
        }

        playChunk(audioBase64, stepId, audioMimeType);
      }


      if (message.type === "ai_message_chunk") {
        if (!message.payload.isFinal) {
          bufferRef.current += message.payload.textDelta;
          setStreamingText(bufferRef.current);
        } else {
          // finalize
          const finalText = bufferRef.current;
          bufferRef.current = "";
          setStreamingText("");
          const createdAtMs = Date.now();
          markTeacherUtteranceFinal(finalText, createdAtMs);
          setChat((prev) => [
            ...prev,
            {
              id: `teacher-${createdAtMs}-${prev.length}`,
              role: "teacher",
              text: finalText,
              createdAtMs,
            },
          ]);
          // speak(finalText);

          setDebugState((s) => ({
            ...s,
            aiMessageCount: s.aiMessageCount + 1,
          }));
        }
      }

      if (message.type === "ai_message") {
        // Intentionally ignore full ai_message to avoid duplicating chunk-finalized messages.
        // speak(message.payload.text);
      }
    },
    [dispatchTeacher, setDebugState, sendTimeRef, stepTimelineRef, lastStepIndexRef, DEBUG_EQUATION_STEPS, interruptTTS, playChunk, markTeacherUtteranceFinal, resolveStepIdFromIndex],
  );

  //Your step status timer
  useEffect(() => {
    const expectsAudio =
      teacherState === "explaining" || teacherState === "re-explaining";
    if (!expectsAudio) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      setEquationSteps((prev) => {
        let changed = false;
        const next = prev.map((step) => {
          if (step.runId !== currentProblemIdRef.current) return step;
          if (step.audioStatus !== "pending") return step;
          if (now - step.audioPendingAtMs <= 1500) return step;
          changed = true;
          return { ...step, audioStatus: AUDIO_BUFFERING };
        });
        return changed ? next : prev;
      });
    }, 300);
    return () => window.clearInterval(interval);
  }, [teacherState]);

  return {
    chat,
    streamingText,
    equationSteps,
    currentProblemId,
    currentProblemIdRef,
    setProblemId,
    setChat,
    setEquationSteps,
    handleMessage,
    teacherState,
    teacherMeta,
    resetTeacher,
    aiLifecycleTick,
    lastAudioChunkAtMs,
    appendStudentMessage,
    resetDebugForNewProblem,
    maybeStartNewProblemFromStudentText,
    clearConfusionNudge,
  };
}
