import { useCallback, useEffect, useRef, useState } from "react";
import { WebSocketContext } from "./weSocketState";
import { LiveWSClient } from "../transport/wsClient";
import { useDebugState } from "./debugState";
import type { ServerToClientMessage } from "@shared/types";


export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsClientRef = useRef<LiveWSClient | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const subscribersRef = useRef(
    new Set<(msg: ServerToClientMessage) => void>()
  );
  const { setState: setDebugState } = useDebugState();
  const subscribe = useCallback((fn: (msg: ServerToClientMessage) => void) => {
    subscribersRef.current.add(fn);
    return () => subscribersRef.current.delete(fn);
  }, []);

  useEffect(() => {
    let isComponentMounted = true;

    const connect = () => {
      const client = new LiveWSClient((msg: ServerToClientMessage) => {
        for (const fn of subscribersRef.current) {
          try {
            fn(msg);
          } catch (error) {
            console.error("WebSocket subscriber failed", error);
          }
        }
      });

      // Setup listeners for the connection lifecycle
      client.onOpen = () => {
        if (!isComponentMounted) return;
        setReconnectCount(0); // Reset attempts on success
        setDebugState((s) => ({
          ...s,
          connected: true,
          isReconnecting: false,
          sessionStartedAt: Date.now(),
        }));
      };

      client.onClose = () => {
        if (!isComponentMounted) return;
        setDebugState((s) => ({ ...s, connected: false, isReconnecting: true }));

        // Exponential backoff: 1s, 2s, 4s, 8s, maxing at 30s
        const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);

        reconnectTimerRef.current = setTimeout(() => {
          setReconnectCount((prev) => prev + 1);
        }, delay);
      };

      client.connect("ws://localhost:3001");
      wsClientRef.current = client;
    };

    connect();

    return () => {
      isComponentMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsClientRef.current?.close();
      wsClientRef.current = null;
    };
    // Re-run this effect only when reconnectCount changes
  }, [reconnectCount, setDebugState]);

  const reconnect = useCallback(() => {
    // Stop any pending timers
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

    // Close existing connection
    wsClientRef.current?.close();

    // Increment count to trigger the useEffect
    setReconnectCount((prev) => prev + 1);
  }, []);

  return (
    <WebSocketContext.Provider value={{ wsClientRef, reconnect, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}
