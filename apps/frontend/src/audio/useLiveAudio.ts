import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAudioPlayer } from "./liveAudioPlayer";
import type { AudioPlaybackState } from "./audioTypes";

export function useLiveAudio() {
  const [state, setState] = useState<AudioPlaybackState>("idle");
  const playerRef = useRef<LiveAudioPlayer | null>(null);

  useEffect(() => {
    if (!playerRef.current) {
      playerRef.current = new LiveAudioPlayer(
        () => setState("playing"),
        () => setState("idle")
      );
    }
    return () => {
      playerRef.current = null;
    };
  }, []);

  // Wrap in useCallback
  const playChunk = useCallback((base64: string) => {
    playerRef.current?.enqueueChunk(base64);
  }, []);

  // Wrap in useCallback
  const stop = useCallback(() => {
    playerRef.current!.stop();
    setState("interrupted");
  }, []);

  return {
    playChunk,
    stop,
    audioState: state,
    // stop: () => {
    //   playerRef.current!.stop();
    //   setState("interrupted");
    // },
  };
}
