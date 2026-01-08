/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { GeminiLiveClient } from "./GeminiLiveClient";

export function useGeminiLiveStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      clientRef.current = new GeminiLiveClient(videoRef.current);
    }
  }, []);

  function handleChunk(chunk: any) {
    if (!clientRef.current) return;

    if (chunk.type === "audio") {
      clientRef.current.playAudio(chunk.data);
    }

    if (chunk.type === "video") {
      clientRef.current.playVideo(chunk.data);
    }
  }

  return { videoRef, handleChunk };
}
