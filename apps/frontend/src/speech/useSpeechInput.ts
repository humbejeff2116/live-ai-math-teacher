import { useEffect, useMemo, useRef, useState } from "react";
import { SpeechRecognizer } from "./speechRecognizer";
import { useDebugState } from "../state/debugState";
import { useWebSocketState } from "../state/weSocketState";
import type { ConfusionReason, ConfusionSeverity } from "@shared/types";

// Match shared types loosely but keep this file standalone
type ConfusionPayload = {
  source: "voice";
  reason: ConfusionReason;
  severity: ConfusionSeverity;
  text?: string;
  stepIdHint?: string | null;
  observedAtMs: number;
};

type SendConfusion = (payload: ConfusionPayload) => void;

export function useSpeechInput(
  onTranscript: (text: string) => void,
  setIsListening: (val: boolean) => void,
  opts?: {
    sendConfusion?: SendConfusion;
    getStepIdHint?: () => string | null;
  },
) {
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const { setState: setDebugState } = useDebugState();
  const { wsClientRef } = useWebSocketState();

  const [micLevel, setMicLevel] = useState(0);

  // existing: “speaking” threshold
  const SPEAKING_TH = 0.12;
  const isUserSpeaking = useMemo(() => micLevel > SPEAKING_TH, [micLevel]);

  // ===== pause/hesitation detection state =====
  const listeningRef = useRef(false);
  const listeningStartedAtMsRef = useRef<number>(0);
  const lastVoiceAtMsRef = useRef<number>(0);

  // Hesitation signals: small “bursts” below speaking threshold
  const lastAnyEnergyAtMsRef = useRef<number>(0);
  const recentLowBurstCountRef = useRef<number>(0);
  const lastLowBurstAtMsRef = useRef<number>(0);

  // anti-spam
  const lastConfusionSentAtMsRef = useRef<number>(0);

  // ---- Tunables (demo-friendly defaults) ----
  const ARM_AFTER_MS = 700;

  // Pause: silence window after we believe they should be answering
  const PAUSE_AFTER_MS = 2200;

  // Hesitation:
  // - low burst = mic crosses LOW_TH briefly (like “uh…”) but doesn't reach speaking
  const LOW_TH = 0.05;
  const LOW_BURST_MAX_MS = 520; // burst duration cap
  const HESITATION_WINDOW_MS = 2200; // bursts must occur within this window
  const HESITATION_SILENCE_AFTER_MS = 1400; // after bursts, if silence lasts this long -> hesitation
  const HESITATION_MIN_BURSTS = 2;

  // Cooldown for any confusion signal
  const COOLDOWN_MS = 4500;

  useEffect(() => {
    const stop = () => {
      recognizerRef.current?.stop();
      listeningRef.current = false;
      setIsListening(false);
      setMicLevel(0);
    };

    recognizerRef.current = new SpeechRecognizer(
      (text) => {
        setDebugState((s) => ({ ...s, lastTranscript: text }));
        onTranscript(text);
        stop();
      },
      () => {
        // recognition started
        wsClientRef.current?.send({ type: "user_interrupt" });
        setIsListening(true);

        const now = Date.now();
        listeningRef.current = true;
        listeningStartedAtMsRef.current = now;

        // initialize timers
        lastVoiceAtMsRef.current = now;
        lastAnyEnergyAtMsRef.current = now;

        // reset hesitation counters
        recentLowBurstCountRef.current = 0;
        lastLowBurstAtMsRef.current = 0;

        // do NOT reset lastConfusionSentAtMsRef here (cooldown should persist)
      },
      () => {
        stop();
      },
      (err) => {
        setDebugState((s) => ({ ...s, lastSpeechError: String(err) }));
        stop();
      },
      (level01) => {
        setMicLevel(level01);

        const now = Date.now();

        // Track any non-trivial energy (helps avoid “mic is dead” false positives)
        if (level01 > 0.02) lastAnyEnergyAtMsRef.current = now;

        // Normal “speaking”
        if (level01 > SPEAKING_TH) {
          lastVoiceAtMsRef.current = now;
          // speaking cancels “hesitation burst” accumulation
          recentLowBurstCountRef.current = 0;
          lastLowBurstAtMsRef.current = 0;
          return;
        }

        // Low-energy burst detection (hesitation-like)
        if (level01 > LOW_TH && level01 <= SPEAKING_TH) {
          // Count burst if it’s not just continuous noise
          if (now - lastLowBurstAtMsRef.current > LOW_BURST_MAX_MS) {
            recentLowBurstCountRef.current += 1;
          }
          lastLowBurstAtMsRef.current = now;
          // also treat as “voice activity” for pause purposes
          lastVoiceAtMsRef.current = now;
        }
      },
    );

    return () => {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
      listeningRef.current = false;
    };
  }, [onTranscript, setDebugState, setIsListening, wsClientRef]);

  // Pause + hesitation detection loop
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!listeningRef.current) return;
      if (!opts?.sendConfusion) return;

      const now = Date.now();
      const listeningFor = now - listeningStartedAtMsRef.current;
      if (listeningFor < ARM_AFTER_MS) return;

      // Cooldown shared between pause + hesitation
      const sinceLastSignal = now - lastConfusionSentAtMsRef.current;
      if (sinceLastSignal < COOLDOWN_MS) return;

      const silentFor = now - lastVoiceAtMsRef.current;

      // --- Hesitation rule (prefer over pause) ---
      // If we saw multiple low bursts recently, and now there’s a silence,
      // treat it as hesitation (more human than “pause”)
      const lastLowBurstAt = lastLowBurstAtMsRef.current;
      const burstCount = recentLowBurstCountRef.current;
      const inWindow =
        lastLowBurstAt > 0 && now - lastLowBurstAt <= HESITATION_WINDOW_MS;

      const qualifiesHesitation =
        burstCount >= HESITATION_MIN_BURSTS &&
        inWindow &&
        silentFor >= HESITATION_SILENCE_AFTER_MS;

      if (qualifiesHesitation) {
        lastConfusionSentAtMsRef.current = now;

        // reset so we don’t immediately trigger again
        recentLowBurstCountRef.current = 0;
        lastLowBurstAtMsRef.current = 0;

        const stepIdHint = opts.getStepIdHint?.() ?? null;
        opts.sendConfusion({
          source: "voice",
          reason: "hesitation",
          severity: silentFor > 3000 ? "medium" : "low",
          stepIdHint,
          observedAtMs: now,
          text: "low_energy_bursts_then_silence",
        });
        return;
      }

      // --- Pause rule (fallback) ---
      if (silentFor >= PAUSE_AFTER_MS) {
        lastConfusionSentAtMsRef.current = now;

        const stepIdHint = opts.getStepIdHint?.() ?? null;
        opts.sendConfusion({
          source: "voice",
          reason: "pause",
          severity: silentFor > 4000 ? "medium" : "low",
          stepIdHint,
          observedAtMs: now,
          text: "silence_detected",
        });
      }
    }, 200);

    return () => window.clearInterval(id);
  }, [opts]);

  async function startListening() {
    await recognizerRef.current?.start();
  }

  function stopListening() {
    recognizerRef.current?.stop();
    listeningRef.current = false;
    setIsListening(false);
    setMicLevel(0);
  }

  return {
    startListening,
    stopListening,
    micLevel,
    isUserSpeaking,
  };
}
