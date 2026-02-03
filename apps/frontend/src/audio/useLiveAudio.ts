import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAudioPlayer } from "./liveAudioPlayer";
import type { AudioPlaybackState, WaveformPoint } from "./audioTypes";
import type { AudioStepTimeline } from "./audioStepTimeLine";
import { getAutoplay, setAutoplay as setAutoplaySetting } from "./autoplaySetting";

export function useLiveAudio(timelineRef?: RefObject<AudioStepTimeline>) {
  const isDev = import.meta.env.MODE !== "production";
  const [audioState, setAudioState] = useState<AudioPlaybackState>("idle");
  const [waveform, setWaveform] = useState<WaveformPoint[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [bufferedDurationMs, setBufferedDurationMs] = useState(0);
  const [autoplayExplanations, setAutoplayExplanationsState] = useState(() =>
    getAutoplay(),
  );
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const didAutoplayRef = useRef(false);
  const READY_SEC = 0.3;

  useEffect(() => {
    const player = new LiveAudioPlayer(
      () => setAudioState("playing"),
      () =>
        setAudioState(
          player.getBufferedDurationMs() > 0 ? "ended" : "idle",
        ),
    );
    playerRef.current = player;

    let raf: number;
    const tick = () => {
      const activePlayer = playerRef.current;
      if (activePlayer) {
        const maxMs = activePlayer.getBufferedDurationMs();
        const rawMs = activePlayer.getCurrentTimeMs();
        const safeMs = maxMs > 0 ? Math.min(rawMs, maxMs) : rawMs;
        setCurrentTimeMs(safeMs);
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

  useEffect(() => {
    if (audioState !== "ready") return;
    if (!autoplayExplanations) return;
    if (didAutoplayRef.current) return;
    didAutoplayRef.current = true;
    const player = playerRef.current;
    if (!player) return;
    player.armOutput();
    player.kick();
  }, [audioState, autoplayExplanations]);

  const syncFromPlayer = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    setWaveform([...p.getWaveform()]);
    setBufferedDurationMs(p.getBufferedDurationMs());
    // keep current time in sync too (useful after replay/seek)
    const maxMs = p.getBufferedDurationMs();
    const rawMs = p.getCurrentTimeMs();
    const safeMs = maxMs > 0 ? Math.min(rawMs, maxMs) : rawMs;
    setCurrentTimeMs(safeMs);
  }, []);

  const unlockAudio = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return false;
    const ok = await player.unlock();
    if (ok && player.isOutputEnabled()) player.kick();
    // ensure bars don’t disappear after unlock/play
    syncFromPlayer();
    return ok;
  }, [syncFromPlayer]);
  
  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.armOutput();
    player.kick();
    // keep waveform visible when playback starts
    syncFromPlayer();
  }, [syncFromPlayer]);

  const resume = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return false;
    player.armOutput();
    const ok = await player.resume();
    if (ok) setAudioState("playing");
    // keep waveform visible on resume
    syncFromPlayer();
    return ok;
  }, [syncFromPlayer]);

  const replay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    player.replayFromMs(0);

    // immediately refresh UI from retained “tape”
    syncFromPlayer();

    // resume the AudioContext if needed
    void player.resume();

    setAudioState("playing");
  }, [syncFromPlayer]);

  const playChunk = useCallback(
    async (base64: string, stepId?: string, mimeType?: string) => {
      const player = playerRef.current;
      if (!player) return;

      const isFreeform =
        typeof stepId === "string" && stepId.startsWith("__freeform__");
      const timeline = timelineRef?.current;

      const isPcm =
        mimeType?.startsWith("audio/pcm") ||
        mimeType?.includes("L16") ||
        mimeType?.includes("linear16");

      // Only register timeline for real step audio
      if (timeline && isPcm && stepId && !isFreeform) {
        let bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        if (bytes.length % 2 === 1) bytes = bytes.slice(0, bytes.length - 1);

        const chunkSamples = bytes.length / 2;
        if (chunkSamples > 0) {
          timeline.registerChunkSamples(stepId, chunkSamples);
        }
      }

      await player.enqueueChunk(base64, mimeType);
      const totalMs = player.getBufferedDurationMs();
      const pendingSec = player.getPendingBufferedSec();
      setBufferedDurationMs(totalMs);
      setWaveform([...player.getWaveform()]);
      if (isDev) {
        console.warn(
          "[liveAudio.playChunk]",
          {
            audioState,
            totalMs,
            pendingSec,
            waveformLen: player.getWaveform().length,
          },
          new Error().stack,
        );
      }


      setAudioState((prev) => {
        if (prev === "playing" || prev === "paused") return prev;
        if (
          (prev === "idle" || prev === "ended" || prev === "interrupted") &&
          totalMs > 0
        ) {
          return pendingSec >= READY_SEC ? "ready" : "buffering";
        }
        if (prev === "buffering" && pendingSec >= READY_SEC) return "ready";
        return prev;
      });
    },
    [audioState, isDev, timelineRef],
  );

  const seekToMs = useCallback((targetMs: number) => {
    const player = playerRef.current;
    if (!player) return;
    const maxMs = player.getBufferedDurationMs();
    const safeTargetMs = Math.max(0, Math.min(targetMs, Math.max(0, maxMs - 10)));
    player.seekToMs(safeTargetMs);
    setCurrentTimeMs(safeTargetMs);
  }, []);

  const seekWithFadeMs = useCallback(
    (targetMs: number, fadeOutMs = 100, fadeInMs = 150) => {
      const player = playerRef.current;
      if (!player) return false;
      try {
        const maxMs = player.getBufferedDurationMs();
        const safeTargetMs = Math.max(
          0,
          Math.min(targetMs, Math.max(0, maxMs - 10)),
        );
        player.seekWithFadeMs(safeTargetMs, fadeOutMs, fadeInMs);
        setCurrentTimeMs(safeTargetMs);
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

  const pause = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return false;
    player.disarmOutput();
    const ok = await player.pause();
    if (ok) setAudioState("paused");
    return ok;
  }, []);


  const reset = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isDev) {
      console.warn(
        "[useLiveAudio.reset]",
        { audioState, bufferedDurationMs, waveformLen: waveform.length },
        new Error().stack,
      );
    }
    player.resetSession();
    didAutoplayRef.current = false;
    setAudioState("idle");
    setWaveform([]);
    setCurrentTimeMs(0);
    setBufferedDurationMs(0);
  }, [audioState, bufferedDurationMs, isDev, waveform.length]);

  const setAutoplayExplanations = useCallback((next: boolean) => {
    setAutoplaySetting(next);
    setAutoplayExplanationsState(next);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    playerRef.current?.setPlaybackRate(rate);
  }, []);

  return {
    playChunk,
    seekToMs,
    seekWithFadeMs,
    interrupt,
    unlockAudio,
    play,
    pause,
    resume,
    replay,
    reset,
    autoplayExplanations,
    setAutoplayExplanations,
    audioState,
    waveform,
    currentTimeMs,
    bufferedDurationMs,
    setPlaybackRate,
  };
}
