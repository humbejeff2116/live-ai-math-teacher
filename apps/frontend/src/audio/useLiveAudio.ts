import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAudioPlayer } from "./liveAudioPlayer";
import type { AudioPlaybackState, WaveformPoint } from "./audioTypes";

export function useLiveAudio() {
  const [audioState, setAudioState] = useState<AudioPlaybackState>("idle");
  const [waveform, setWaveform] = useState<WaveformPoint[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  const playerRef = useRef<LiveAudioPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new LiveAudioPlayer(
      () => setAudioState("playing"),
      () => setAudioState("idle")
    );

    let raf: number;
    const tick = () => {
      if (playerRef.current) {
        setCurrentTimeMs(playerRef.current.getCurrentTimeMs());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      playerRef.current?.stop();
      playerRef.current = null;
    };
  }, []);

  const playChunk = useCallback((base64: string) => {
    const player = playerRef.current;
    if (!player) return;

    player.enqueueChunk(base64);
    setWaveform([...player.getWaveform()]);
  }, []);

  const seekToMs = useCallback((targetMs: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.seekToMs(targetMs);
    setCurrentTimeMs(targetMs);
  }, []);

  const seekWithFadeMs = useCallback(
    (targetMs: number, fadeOutMs = 100, fadeInMs = 150) => {
      const player = playerRef.current;
      if (!player) return false;
      try {
        player.seekWithFadeMs(targetMs, fadeOutMs, fadeInMs);
        setCurrentTimeMs(targetMs);
        return true;
      } catch (error) {
        console.warn("Audio seek with fade failed.", error);
        return false;
      }
    },
    []
  );

  const interrupt = useCallback(() => {
    playerRef.current?.stop();
    setAudioState("interrupted");
  }, []);

  return {
    playChunk,
    seekToMs,
    seekWithFadeMs,
    interrupt,
    audioState,
    waveform,
    currentTimeMs,
  };
}


