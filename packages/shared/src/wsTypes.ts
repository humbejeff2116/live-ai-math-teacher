import type { EquationStep, ReexplanStyle } from "./types";
import type { TeacherSignal } from "./teacherState";

export type ResumeFromStepSource = "waveform";

export type AudioStatus =
  | "connecting"
  | "ready"
  | "reconnecting"
  | "closed"
  | "error"
  | "handshaking";

export type ConfusionReason =
  | "pause"
  | "hesitation"
  | "wrong_answer"
  | "repeat_request"
  | "general";

export type ConfusionSource = "voice" | "text" | "video" | "system";

export type ConfusionSeverity = "low" | "medium" | "high";

export type ClientToServerMessage =
  | {
      type: "user_message";
      payload: {
        text: string;
      };
    }
  | {
      type: "close";
    }
  | {
      type: "user_interrupt";
    }
  | {
      type: "resume_request";
      payload: {
        studentUtterance: string;
        lastKnownStepIndex: number | null;
      };
    }
  | {
      type: "reexplain_step";
      payload: {
        stepId: string;
        style?: ReexplanStyle;
      };
    }
  | {
      type: "select_step_nl"; //natural language step selection e.g Explain step two again, Go back to the simplification step, That last equation confused me
      payload: {
        text: string;
      };
    }
  | {
      type: "confusion_signal";
      payload: {
        source: ConfusionSource;
        reason: ConfusionReason;
        severity: ConfusionSeverity;
        text?: string; // transcript or note
        stepIdHint?: string | null; // active step if client knows it
        observedAtMs: number;
      };
    }
  | {
      type: "confusion_nudge_dismissed";
      payload: {
        stepId: string;
        atMs: number;
      };
    }
  | {
      type: "resume_from_step";
      payload: {
        stepId: string;
        source: ResumeFromStepSource;
      };
    }
  | {
      type: "reset_session";
    }
  | {
      type: "confusion_help_response";
      payload: {
        offerId: string; // NEW
        stepId: string; // step being offered
        choice: "hint" | "explain"; // NEW
        atMs: number;
      };
    };

export type ServerToClientMessage =
  | TeacherSignal
  | {
      type: "confusion_nudge_offered";
      payload: {
        offerId: string;
        stepId: string;
        stepIndex: number;
        source: ConfusionSource;
        reason: ConfusionReason;
        severity: ConfusionSeverity;
        atMs: number; // Date.now() on server
      };
    }
  | {
      type: "audio_status";
      payload: {
        status: AudioStatus;
        // optional metadata for debugging/UX
        reason?: string;
        atMs: number; // Date.now() on server
      };
    }
  | {
      type: "ai_audio_chunk";
      payload: {
        audioBase64: string;
        audioMimeType?: string;
        stepId: string;
      };
    }
  | {
      type: "ai_message_chunk";
      payload: {
        textDelta: string;
        isFinal: boolean;
      };
    }
  | {
      type: "equation_step";
      payload: EquationStep;
    }
  | {
      type: "ai_message";
      payload: {
        text: string;
      };
    }
  | {
      type: "ai_interrupted";
    }
  | {
      type: "ai_resumed";
      payload: {
        resumeFromStepIndex: number;
      };
    }
  | {
      type: "step_audio_start";
      payload: {
        stepId: string;
        atMs: number;
      };
    }
  | {
      type: "step_audio_end";
      payload: {
        stepId: string;
        atMs: number;
      };
    }
  | {
      type: "ai_reexplained";
      payload: { reexplainedStepIndex: number };
    }
  | {
      type: "ai_confusion_handled";
      payload: {
        confusionHandledStepIndex: number;
        source: ConfusionSource;
        reason: ConfusionReason;
        severity: ConfusionSeverity;
        stepIdHint?: string | null;
        atMs: number; // Date.now() on server
      };
    }
  | {
      type: "confusion_nudge_offered";
      payload: {
        offerId: string; // NEW
        stepId: string;
        stepIndex: number;
        source: ConfusionSource;
        reason: ConfusionReason;
        severity: ConfusionSeverity;
        atMs: number;
      };
    };
