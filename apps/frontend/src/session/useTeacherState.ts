import type { 
  ConfusionReason, 
  ConfusionSeverity, 
  ConfusionSource, 
  ServerToClientMessage, 
  TeacherState 
} from "@shared/types";
import { useCallback, useReducer } from "react";
import { logEvent } from "../lib/debugTimeline";
import { recordEvent as recordPersonalizationEvent } from "../personalization";

const isDev = import.meta.env.MODE !== "production";

type TeacherMeta = {
  // Did the last teacher utterance look like a question?
  lastUtteranceWasQuestion: boolean;
  // When we entered "waiting" AND the last utterance looked like a question
  awaitingAnswerSinceMs: number | null;
  // For debugging / future heuristics
  lastTeacherUtteranceAtMs: number | null;
  confusionNudge: {
    offerId: string;
    stepId: string;
    stepIndex: number;
    source: ConfusionSource;
    reason: ConfusionReason;
    severity: ConfusionSeverity;
    atMs: number;
  } | null;
  silenceNudge: {
    offerId: string;
    stepId: string;
    stepIndex: number;
    reason: "no_reply";
    severity: "low";
    atMs: number;
  } | null;
};

type TeacherModel = {
  state: TeacherState;
  meta: TeacherMeta;
};

type Action =
  | { type: "server_message"; message: ServerToClientMessage }
  | { type: "teacher_utterance_final"; text: string; atMs: number }
  | { type: "clear_confusion_nudge" }
  | { type: "clear_silence_nudge" }
  | { type: "reset" };

function looksLikeQuestion(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;

  // Strong signal
  if (t.endsWith("?")) return true;

  // Common “question without ?” patterns in tutoring
  // Keep conservative to avoid false positives.
  const q = t.toLowerCase();
  if (
    /\b(can you|could you|what|why|how|which|when|where|do you|did you|are you|is it|does that)\b/.test(
      q,
    )
  ) {
    return true;
  }

  // “Tell me …” / “Try …” / “Now you …” are NOT necessarily questions, so we ignore.
  return false;
}

function reducer(model: TeacherModel, action: Action): TeacherModel {
  switch (action.type) {
    case "reset": {
      return {
        state: "idle",
        meta: {
          lastUtteranceWasQuestion: false,
          awaitingAnswerSinceMs: null,
          lastTeacherUtteranceAtMs: null,
          confusionNudge: null,
          silenceNudge: null,
        },
      };
    }

    case "teacher_utterance_final": {
      const isQ = looksLikeQuestion(action.text);
      return {
        ...model,
        meta: {
          ...model.meta,
          lastUtteranceWasQuestion: isQ,
          lastTeacherUtteranceAtMs: action.atMs,
          // don’t set awaiting here; we set it when we actually enter waiting
        },
      };
    }

    case "clear_confusion_nudge":
      return { ...model, meta: { ...model.meta, confusionNudge: null } };

    case "clear_silence_nudge":
      return { ...model, meta: { ...model.meta, silenceNudge: null } };

    case "server_message": {
      const msg = action.message;
      switch (msg.type) {
        case "teacher_explaining":
        case "teacher_reexplaining":
        case "teacher_thinking":
          return {
            ...model,
            state:
              msg.type === "teacher_explaining"
                ? "explaining"
                : msg.type === "teacher_reexplaining"
                  ? "re-explaining"
                  : "thinking",
            meta: {
              ...model.meta,
              awaitingAnswerSinceMs: null,
              silenceNudge: null, // important: teacher is talking, silence offer is irrelevant
            },
          };

        case "teacher_interrupted":
          return {
            ...model,
            state: "interrupted",
            meta: {
              ...model.meta,
              awaitingAnswerSinceMs: null,
              silenceNudge: null, // important: silence is only for waiting
            },
          };

        case "teacher_waiting": {
          const now = Date.now();
          const awaiting = msg.awaitingAnswerSinceMs ?? now;
          if (isDev) {
            console.log("[useTeacherState] teacher_waiting", {
              atMs: now,
              message: msg,
              lastUtteranceWasQuestion: model.meta.lastUtteranceWasQuestion,
              prevAwaitingAnswerSinceMs: model.meta.awaitingAnswerSinceMs,
              nextAwaitingAnswerSinceMs: awaiting,
              awaitingAnswerSinceMsUpdated:
                model.meta.awaitingAnswerSinceMs !== awaiting,
              stateTransition: "waiting",
            });
          }

          return {
            ...model,
            state: "waiting",
            meta: {
              ...model.meta,
              awaitingAnswerSinceMs: awaiting,
              // don't auto-clear silence here; we want it to remain until dismissed or teacher speaks again
            },
          };
        }

        case "confusion_nudge_offered": {
          logEvent("NudgeShown", {
            step: msg.payload.stepIndex + 1,
            reason: msg.payload.reason,
            source: msg.payload.source,
          });
          recordPersonalizationEvent({
            type: "nudge_shown",
            stepId: msg.payload.stepId,
            reason: msg.payload.reason,
            atMs: msg.payload.atMs,
          });
          return {
            ...model,
            meta: {
              ...model.meta,
              confusionNudge: {
                offerId: msg.payload.offerId,
                stepId: msg.payload.stepId,
                stepIndex: msg.payload.stepIndex,
                source: msg.payload.source,
                reason: msg.payload.reason,
                severity: msg.payload.severity,
                atMs: msg.payload.atMs,
              },
            },
          };
        }

        case "silence_nudge_offered":
          if (isDev) {
            console.log("[useTeacherState] silence_nudge_offered", {
              atMs: Date.now(),
              payload: msg.payload,
            });
          }
          return {
            ...model,
            meta: {
              ...model.meta,
              silenceNudge: {
                offerId: msg.payload.offerId,
                stepId: msg.payload.stepId,
                stepIndex: msg.payload.stepIndex,
                reason: msg.payload.reason,
                severity: msg.payload.severity,
                atMs: msg.payload.atMs,
              },
            },
          };

        default:
          return model;
      }
    }
    default:
      return model;
  }
}

export function useTeacherState() {
  const [model, dispatch] = useReducer(reducer, {
    state: "idle",
    meta: {
      lastUtteranceWasQuestion: false,
      awaitingAnswerSinceMs: null,
      lastTeacherUtteranceAtMs: null,
      confusionNudge: null,
      silenceNudge: null,
    },
  });

  // Keep your existing call sites working:
  // dispatchTeacher(serverMessage)
  const dispatchTeacher = useCallback(
    (message: ServerToClientMessage) =>
      dispatch({ type: "server_message", message }),
    [],
  );

  // Call this when you finalize the teacher's text (you have finalText in useHandleMessage)
  const markTeacherUtteranceFinal = useCallback(
    (text: string, atMs: number) =>
      dispatch({ type: "teacher_utterance_final", text, atMs }),
    [],
  );

  const clearConfusionNudge = useCallback(
    () => dispatch({ type: "clear_confusion_nudge" }),
    [],
  );

  const clearSilenceNudge = useCallback(
    () => dispatch({ type: "clear_silence_nudge" }),
    [],
  );

  const resetTeacher = useCallback(() => dispatch({ type: "reset" }), []);

  return {
    teacherState: model.state,
    teacherMeta: model.meta,
    dispatchTeacher,
    markTeacherUtteranceFinal,
    resetTeacher,
    clearConfusionNudge,
    clearSilenceNudge,
  };
}
