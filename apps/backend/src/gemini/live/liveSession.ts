import { geminiClient } from "../client/client";
import { geminiLiveConfig } from "./liveConfig";
import { GeminiLiveSession } from "./liveTypes";
import crypto from "crypto";

export async function createGeminiLiveSession(): Promise<GeminiLiveSession> {
  // NOTE: This is a placeholder for the Live API session init.
  // Gemini Live uses a WebSocket under the hood — we prepare for that.

  const sessionId = crypto.randomUUID();

  // Auth validation — forces key correctness early
  geminiClient.getGenerativeModel({
    model: geminiLiveConfig.model,
  });

  return {
    sessionId,
    state: "connected",
    createdAt: new Date(),
  };
}

export async function closeGeminiLiveSession(
  session: GeminiLiveSession
): Promise<void> {
  session.state = "closed";
}
