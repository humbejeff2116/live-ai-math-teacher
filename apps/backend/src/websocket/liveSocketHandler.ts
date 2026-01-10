import WebSocket from "ws";
import { GeminiLiveSession } from "../gemini/live/liveSession";
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
    }
  });
}
