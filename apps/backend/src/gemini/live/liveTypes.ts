export type GeminiLiveSessionState = "idle" | "connected" | "closed";

export type GeminiLiveSession = {
  sessionId: string;
  state: GeminiLiveSessionState;
  createdAt: Date;
};
