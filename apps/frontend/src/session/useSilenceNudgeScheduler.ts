import type { LiveWSClient } from "@/transport/wsClient";
import { useEffect, useRef } from "react";

export function useSilenceNudgeScheduler(args: {
  enabled: boolean;
  awaitingAnswerSinceMs: number | null;
  hasSilenceNudge: boolean;
  isTyping: boolean;
  wsClient: LiveWSClient | null;
  stepIdHint: string | null;
  delayMs?: number;
  isDev?: boolean;
}) {
  const {
    enabled,
    awaitingAnswerSinceMs,
    hasSilenceNudge,
    isTyping,
    wsClient,
    stepIdHint,
    delayMs = 6500,
    isDev = false,
  } = args;

  const timerRef = useRef<number | null>(null);
  const retryRef = useRef(0);
  const lastScheduledEpisodeRef = useRef<number | null>(null);
  const armedEpisodeRef = useRef<number | null>(null);

  const wsRef = useRef<LiveWSClient | null>(null);
  useEffect(() => {
    wsRef.current = wsClient;
  }, [wsClient]);

  useEffect(() => {
    const episodeKey = awaitingAnswerSinceMs ?? null;
    const canSchedule =
      enabled && episodeKey != null && !hasSilenceNudge && !isTyping;

    if (isDev) {
      console.log("[useSilenceNudgeScheduler] effect", {
        enabled,
        awaitingAnswerSinceMs,
        hasSilenceNudge,
        isTyping,
        delayMs,
        episodeKey,
        armedEpisode: armedEpisodeRef.current,
        lastScheduledEpisode: lastScheduledEpisodeRef.current,
        hasTimer: timerRef.current != null,
        retryAttempt: retryRef.current,
        wsReady: Boolean(wsRef.current),
      });
    }

    if (!canSchedule) {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      retryRef.current = 0;
      armedEpisodeRef.current = null;
      return;
    }

    // don’t re-schedule same waiting episode after it already fired once
    if (lastScheduledEpisodeRef.current === episodeKey) return;

    // already armed for this same episode
    if (timerRef.current != null && armedEpisodeRef.current === episodeKey)
      return;

    // episode changed: cancel existing timer + reset retry
    if (timerRef.current != null && armedEpisodeRef.current !== episodeKey) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      retryRef.current = 0;
    }

    armedEpisodeRef.current = episodeKey;

    const retryDelays = [150, 300, 600, 900];

    const fire = () => {
      const ws = wsRef.current;

      if (!ws) {
        const attempt = retryRef.current;
        if (attempt < retryDelays.length) {
          const backoffMs = retryDelays[attempt];
          retryRef.current += 1;
          timerRef.current = window.setTimeout(fire, backoffMs);
          return;
        }
        timerRef.current = null;
        return;
      }

      ws.send({
        type: "silence_nudge",
        payload: { stepIdHint, observedAtMs: Date.now() },
      });

      retryRef.current = 0; // reset after success
      lastScheduledEpisodeRef.current = episodeKey;
      timerRef.current = null;
    };

    timerRef.current = window.setTimeout(fire, delayMs);

    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    enabled,
    awaitingAnswerSinceMs,
    hasSilenceNudge,
    isTyping,
    stepIdHint,
    delayMs,
    isDev,
  ]);
}
