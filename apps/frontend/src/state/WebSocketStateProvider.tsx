// WebSocketProvider.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { WebSocketContext } from "./weSocketState";
import { LiveWSClient } from "../transport/wsClient";
import { useDebugState } from "./debugState";
import type { ServerToClientMessage } from "@shared/types";
import { buildWsUrl } from "@/transport/wsUrl";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsClientRef = useRef<LiveWSClient | null>(null);

  // Subscribers
  const subscribersRef = useRef(
    new Set<(msg: ServerToClientMessage) => void>(),
  );

  // Reconnect coordination
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0); // source of truth for attempt count (no stale closure)
  const connectSeqRef = useRef(0); // increments each time we (re)connect to invalidate old callbacks

  // Optional UI/debug counter (not used for logic)
  const [, setReconnectCount] = useState(0);

  const { setState: setDebugState } = useDebugState();

  const subscribe = useCallback((fn: (msg: ServerToClientMessage) => void) => {
    subscribersRef.current.add(fn);
    return () => subscribersRef.current.delete(fn);
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(function connectFn() {
    // Invalidate any previous connection callbacks/timers
    connectSeqRef.current += 1;
    const seq = connectSeqRef.current;

    clearReconnectTimer();

    // If an old client exists, best-effort close it (LiveWSClient doesn't expose close, so we just drop it)
    // If you later add a close() method, call it here.
    wsClientRef.current = null;

    const client = new LiveWSClient((msg: ServerToClientMessage) => {
      // Ignore messages from stale connection sequences (defensive)
      if (seq !== connectSeqRef.current) return;

      for (const fn of subscribersRef.current) {
        try {
          fn(msg);
        } catch (error) {
          console.error("WebSocket subscriber failed", error);
        }
      }
    });

    client.onOpen = () => {
      if (seq !== connectSeqRef.current) return;

      attemptRef.current = 0;
      setReconnectCount(0);
      setDebugState((s) => ({
        ...s,
        connected: true,
        isReconnecting: false,
        sessionStartedAt: Date.now(),
      }));
    };

    client.onClose = () => {
      if (seq !== connectSeqRef.current) return;

      setDebugState((s) => ({
        ...s,
        connected: false,
        isReconnecting: true,
      }));

      // compute attempt using ref (no stale state)
      attemptRef.current += 1;
      const attempt = attemptRef.current;

      setReconnectCount(attempt); // for UI/debug only

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        // Ensure this timer still corresponds to the latest sequence
        if (seq !== connectSeqRef.current) return;
        connectFn();
      }, delay);
    };

    client.connect(buildWsUrl());
    wsClientRef.current = client;
  }, [clearReconnectTimer, setDebugState]);

  useEffect(() => {
    connect();

    return () => {
      // Invalidate everything
      connectSeqRef.current += 1;
      clearReconnectTimer();
      //
      wsClientRef.current?.close();
      wsClientRef.current = null;
    };
  }, [connect, clearReconnectTimer]);

  const reconnect = useCallback(() => {
    // Manual reconnect should reset backoff
    attemptRef.current = 0;
    setReconnectCount(0);

    // Force a fresh connect sequence immediately
    connect();
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ wsClientRef, reconnect, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}
