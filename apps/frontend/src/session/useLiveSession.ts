import { useEffect, useRef, useState } from "react";
import { LiveWSClient } from "../transport/wsClient";
import type { ServerToClientMessage } from "../transport/wsTypes";
import { useDebugState } from "../state/debugState";

export function useLiveSession() {
  const [messages, setMessages] = useState<string[]>([]);
  const clientRef = useRef<LiveWSClient | null>(null);
  const sendTimeRef = useRef<number | null>(null);
  const { setState: setDebugState } = useDebugState();

  useEffect(() => {
    function handleMessage(message: ServerToClientMessage) {
      if (message.type === "ai_message") {
        setMessages((prev) => [...prev, message.payload.text]);

        setDebugState((s) => ({
          ...s,
          aiMessageCount: s.aiMessageCount + 1,
          lastLatencyMs: sendTimeRef.current
            ? Date.now() - sendTimeRef.current
            : undefined,
        }));
      }
    }
    const client = new LiveWSClient(handleMessage);

    setDebugState((s) => ({
      ...s,
      connected: true,
      sessionStartedAt: Date.now(),
    }));

    client.connect("ws://localhost:3001");
    clientRef.current = client;

    return () => {
      setDebugState((s) => ({ ...s, connected: false }));
      client.close();
    };
  }, [setDebugState]);

  function sendUserMessage(text: string) {
    sendTimeRef.current = Date.now();

    clientRef.current?.send({
      type: "user_message",
      payload: { text },
    });
  }

  return {
    messages,
    sendUserMessage,
  };
}
