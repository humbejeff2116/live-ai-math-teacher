import WebSocket from "ws";

const sessionSockets = new Map<string, WebSocket>();

export function registerSessionSocket(sessionId: string, socket: WebSocket) {
  sessionSockets.set(sessionId, socket);
}

export function getSessionSocket(sessionId: string): WebSocket | undefined {
  return sessionSockets.get(sessionId);
}

export function removeSessionSocket(sessionId: string) {
  sessionSockets.delete(sessionId);
}
