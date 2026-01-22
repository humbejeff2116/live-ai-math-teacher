import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAudioPlayer } from "./liveAudioPlayer";
import type { AudioPlaybackState, WaveformPoint } from "./audioTypes";
import type { AudioStepTimeline } from "./audioStepTimeLine";

export function useLiveAudio(timelineRef?: RefObject<AudioStepTimeline>) {
  const [audioState, setAudioState] = useState<AudioPlaybackState>("idle");
  const [waveform, setWaveform] = useState<WaveformPoint[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const unlockAudio = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return false;
    const ok = await player.unlock();
    if (ok) player.kick(); // start queued audio if any
    return ok;
  }, []);


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

  const playChunk = useCallback(
    async (base64: string, stepId?: string, mimeType?: string) => {
      const player = playerRef.current;
      if (!player) return;

      const timeline = timelineRef?.current;

      // If PCM, compute sample count from base64 payload (int16 mono)
      // and register sample-accurate ranges BEFORE enqueue (order matters).
      const isPcm =
        mimeType?.startsWith("audio/pcm") ||
        mimeType?.includes("L16") ||
        mimeType?.includes("linear16");

      if (timeline && stepId && isPcm) {
        // base64 -> bytes length
        let bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        // PCM must be even length (int16)
        if (bytes.length % 2 === 1) bytes = bytes.slice(0, bytes.length - 1);

        const chunkSamples = bytes.length / 2;
        if (chunkSamples > 0) {
          timeline.registerChunkSamples(stepId, chunkSamples);
        }
      }

      // Still enqueue audio for playback (player does its own decoding)
      await player.enqueueChunk(base64, mimeType);

      setWaveform([...player.getWaveform()]);
    },
    [timelineRef],
  );


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
    unlockAudio,
    audioState,
    waveform,
    currentTimeMs,
  };
}

