import { useEffect, useRef, useState } from "react";
import { LiveWSClient } from "../transport/wsClient";
import type { ServerToClientMessage } from "../transport/wsTypes";

export function useLiveSession() {
  const [messages, setMessages] = useState<string[]>([]);
  const clientRef = useRef<LiveWSClient | null>(null);

  useEffect(() => {
    function handleMessage(message: ServerToClientMessage) {
      if (message.type === "ai_message") {
        setMessages((prev) => [...prev, message.payload.text]);
      }

      if (message.type === "error") {
        console.error("AI error:", message.payload.message);
      }
    }

    const client = new LiveWSClient(handleMessage);
    client.connect("ws://localhost:3001");

    clientRef.current = client;

    return () => {
      client.close();
    };
  }, []);

  function sendUserMessage(text: string) {
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
