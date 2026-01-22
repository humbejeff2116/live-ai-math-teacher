import type { EquationStep, ReexplanStyle } from "./types";
import type { TeacherSignal } from "./teacherState";


export type ResumeFromStepSource = "waveform";

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
        text: string;
        source: "voice" | "text";
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
    };

export type ServerToClientMessage =
  | TeacherSignal
  | {
      type: "ai_audio_chunk";
      payload: {
        audioBase64: string;
        audioMimeType?: string;
        stepId: string; // Include stepId in the message to the client
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
      payload: { confusionHandledStepIndex: number };
    };
