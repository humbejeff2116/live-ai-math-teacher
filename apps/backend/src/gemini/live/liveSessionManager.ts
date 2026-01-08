import { closeGeminiLiveSession, createGeminiLiveSession } from "./liveSession";
import { GeminiLiveSession } from "./liveTypes";



class LiveSessionManager {
  private sessions = new Map<string, GeminiLiveSession>();

  async createSession(): Promise<GeminiLiveSession> {
    const session = await createGeminiLiveSession();
    this.sessions.set(session.sessionId, session);
    return session;
  }

  getSession(sessionId: string): GeminiLiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    await closeGeminiLiveSession(session);
    this.sessions.delete(sessionId);
  }
}

export const liveSessionManager = new LiveSessionManager();
