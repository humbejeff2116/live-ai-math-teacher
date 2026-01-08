/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { GeminiWebSocketClient } from "./wsClient";

export function useGeminiTransport(
  sessionId: string,
  onChunk: (chunk: any) => void
) {
  useEffect(() => {
    const client = new GeminiWebSocketClient(sessionId, onChunk);

    return () => {
      client.close();
    };
  }, [sessionId, onChunk]);
}
