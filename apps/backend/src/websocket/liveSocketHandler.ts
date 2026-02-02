import WebSocket from "ws";
import { GeminiLiveSession } from "../gemini/live/GeminiLiveSession.js";
import { ClientToServerMessage } from "@shared/types";

export function liveSocketHandler(ws: WebSocket) {
  const session = new GeminiLiveSession(ws);

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString()) as ClientToServerMessage;

    switch (msg.type) {
      case "user_message": {
        const resume = Boolean(session.hasResumeContext());
        await session.handleUserMessage(msg.payload.text, resume);
        break;
      }

      case "user_interrupt":
        session.interruptGenerationOnly();
        break;

      case "resume_request":
        await session.resumeFromInterruption({
          studentUtterance: msg.payload.studentUtterance,
          clientStepIndex: msg.payload.lastKnownStepIndex,
        });
        break;

      case "reexplain_step":
        await session.reExplainStep(msg.payload.stepId, msg.payload.style);
        break;

      case "select_step_nl":
        await session.handleNaturalLanguageStepSelection(msg.payload.text);
        break;

      case "silence_nudge":
        console.log("liveSocketHandler::silence_nudge", msg.payload);
        session.handleSilenceNudge(msg.payload);
        break;

      case "silence_nudge_dismissed":
        session.dismissSilenceNudge(msg.payload);
        break;

      case "silence_help_response":
        await session.handleSilenceHelpResponse(msg.payload);
        break;

      case "confusion_signal":
        await session.handleConfusionSignal(msg.payload);
        break;

      case "confusion_nudge_dismissed":
        session.dismissConfusionNudge(msg.payload);
        break;

      case "confusion_help_response":
        await session.handleConfusionHelpResponse(msg.payload);
        break;

      case "resume_from_step":
        await session.resumeFromStep(msg.payload.stepId);
        break;

      case "reset_session":
        session.resetProblem();
        break;

      default:
        console.warn("Unknown message type:", msg);
    }
  });
}
