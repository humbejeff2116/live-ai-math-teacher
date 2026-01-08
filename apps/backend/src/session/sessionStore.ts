import { TeachingState } from "../types/teaching";

const sessions = new Map<string, TeachingState>();

export function createSession(sessionId: string, state: TeachingState) {
  sessions.set(sessionId, state);
}

export function getSession(sessionId: string): TeachingState {
  const state = sessions.get(sessionId);
  if (!state) {
    throw new Error("Session not found");
  }
  return state;
}

export function updateSession(sessionId: string, state: TeachingState) {
  sessions.set(sessionId, state);
}

export function deleteSession(sessionId: string) {
  sessions.delete(sessionId);
}
