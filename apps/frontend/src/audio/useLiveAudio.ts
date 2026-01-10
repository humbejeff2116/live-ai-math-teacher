import { useCallback, useEffect, useRef } from "react";
import { LiveAudioPlayer } from "./liveAudioPlayer";

export function useLiveAudio() {
  const playerRef = useRef<LiveAudioPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new LiveAudioPlayer();
    return () => {
      playerRef.current = null;
    };
  }, []);

  // Wrap in useCallback
  const playChunk = useCallback((base64: string) => {
    playerRef.current?.enqueueChunk(base64);
  }, []);

  return { playChunk };
}
