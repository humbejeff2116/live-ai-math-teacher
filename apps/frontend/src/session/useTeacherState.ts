// useTeacherState.ts
import type { ConfusionReason, ConfusionSeverity, ConfusionSource, ServerToClientMessage, TeacherState } from "@shared/types";
import { useCallback, useReducer } from "react";
import { logEvent } from "../lib/debugTimeline";
import { recordEvent as recordPersonalizationEvent } from "../personalization";

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
};

type TeacherModel = {
  state: TeacherState;
  meta: TeacherMeta;
};

type Action =
  | { type: "server_message"; message: ServerToClientMessage }
  | { type: "teacher_utterance_final"; text: string; atMs: number }
  | { type: "clear_nudge" }
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

    case "clear_nudge": {
      return {
        ...model,
        meta: { ...model.meta, confusionNudge: null },
      };
    }

    case "server_message": {
      const msg = action.message;
      switch (msg.type) {
        case "teacher_thinking":
          return { ...model, state: "thinking" };

        case "teacher_explaining":
          return { ...model, state: "explaining" };

        case "teacher_reexplaining":
          return { ...model, state: "re-explaining" };

        case "teacher_interrupted":
          return {
            ...model,
            state: "interrupted",
            meta: {
              ...model.meta,
              awaitingAnswerSinceMs: null,
            },
          };

        case "teacher_waiting": {
          const now = Date.now();
          const awaiting = model.meta.lastUtteranceWasQuestion ? now : null;

          return {
            ...model,
            state: "waiting",
            meta: {
              ...model.meta,
              awaitingAnswerSinceMs: awaiting,
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

        default:
          return model;
      }
    }
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
    () => dispatch({ type: "clear_nudge" }),
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
  };
}
