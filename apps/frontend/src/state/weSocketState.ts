import { createContext, useContext } from "react";
import type { LiveWSClient } from "../transport/wsClient";

export type WebSocketState = {
  wsClientRef: React.RefObject<LiveWSClient | null> | null;
};

export const WebSocketContext = createContext<{
  wsClientRef: React.RefObject<LiveWSClient | null>;
  reconnect: () => void; // New
} | null>(null);

export function useWebSocketState() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("WebSocketProvider missing");
  return ctx;
}
