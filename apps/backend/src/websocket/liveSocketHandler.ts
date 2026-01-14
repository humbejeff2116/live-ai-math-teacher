import WebSocket from "ws";
import { GeminiLiveSession } from "../gemini/live/GeminiLiveSession";
import { ClientToServerMessage } from "@shared/types";

export function liveSocketHandler(ws: WebSocket) {
  const session = new GeminiLiveSession(ws);

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString()) as ClientToServerMessage;

    switch (msg.type) {
      case "user_message":
        const resume = Boolean(session.hasResumeContext());
        await session.handleUserMessage(msg.payload.text, resume);
        break;

      case "user_interrupt":
        session.interrupt();
        break;

      case "resume_request":
        session.resumeFromInterruption({
          studentUtterance: msg.payload.studentUtterance,
          clientStepIndex: msg.payload.lastKnownStepIndex,
        });
        break;

      case "reexplain_step":
        session.reExplainStep(msg.payload.stepId, msg.payload.style);
        break;

      case "select_step_nl":
        session.handleNaturalLanguageStepSelection(msg.payload.text);
        break;

      case "confusion_signal":
        session.handleConfusion(msg.payload.text);
        break;

      case "resume_from_step":
        session.resumeFromStep(msg.payload.stepId);
        break;
    }
  });
}
