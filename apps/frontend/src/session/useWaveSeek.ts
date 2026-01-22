import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { AudioStepTimeline } from "../audio/audioStepTimeLine";
import type { PendingSeek } from "./useWaveform";
import type { UIEquationStep } from "./useLiveSession";


export function useWaveSeek(
  aiLifecycleTick: number,
  stepTimeline: AudioStepTimeline,
  pendingSeek: PendingSeek | null,
  setPendingSeek: React.Dispatch<React.SetStateAction<PendingSeek | null>>,
  equationSteps: UIEquationStep[],
  activeStepId: string | null,
  currentTimeMs: number,
  seekWithFadeMs: (
    targetMs: number,
    fadeOutMs?: number,
    fadeInMs?: number
  ) => boolean,
  resumeFromStep: (stepId: string) => void
) {
  const [isConfirmingSeek, setIsConfirmingSeek] = useState(false);
  const [seekToast, setSeekToast] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const confirmingSeekIdRef = useRef<number | null>(null);
  const seekToastTimeoutRef = useRef<number | null>(null);
  const seekToastCounterRef = useRef(0);

  const handleSetIsConfirmingSeek = useEffectEvent((isConfirming: boolean) => {
    setIsConfirmingSeek(isConfirming);
  });

  useEffect(() => {
    if (isConfirmingSeek) {
      handleSetIsConfirmingSeek(false);
      confirmingSeekIdRef.current = null;
    }
  }, [aiLifecycleTick, isConfirmingSeek]);

  useEffect(() => {
    if (!pendingSeek) return;
    if (isConfirmingSeek) return;
    if (activeStepId && activeStepId === pendingSeek.stepId) {
      setPendingSeek(null);
    }
  }, [activeStepId, isConfirmingSeek, pendingSeek, setPendingSeek]);

  useEffect(() => {
    return () => {
      if (seekToastTimeoutRef.current != null) {
        window.clearTimeout(seekToastTimeoutRef.current);
        seekToastTimeoutRef.current = null;
      }
    };
  }, []);

  const stepById = useMemo(() => {
    return new Map(equationSteps.map((step) => [step.id, step]));
  }, [equationSteps]);

  const resolveSeekTarget = (
    seek: { stepId: string; timeMs?: number },
    fallbackMs: number
  ): {
    targetMs?: number;
    reason: "stepStart" | "pendingTime" | "nearest" | "none";
  } => {
    const rangeStartMs = stepTimeline.getRangeForStep(seek.stepId)?.startMs;
    if (rangeStartMs != null) {
      return { targetMs: rangeStartMs, reason: "stepStart" };
    }
    if (Number.isFinite(seek.timeMs)) {
      return { targetMs: seek.timeMs, reason: "pendingTime" };
    }
    const ranges = stepTimeline.getRanges();
    if (ranges.length > 0) {
      const basis = Number.isFinite(fallbackMs)
        ? fallbackMs
        : ranges[ranges.length - 1].startMs;
      let nearest = ranges[0].startMs;
      let minDistance = Math.abs(nearest - basis);
      for (const range of ranges) {
        const distance = Math.abs(range.startMs - basis);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = range.startMs;
        }
      }
      return { targetMs: nearest, reason: "nearest" };
    }
    return { targetMs: undefined, reason: "none" };
  };

  const onConfirmWaveSeek = () => {
    if (isConfirmingSeek || !pendingSeek) return;
    confirmingSeekIdRef.current = pendingSeek.id;
    setIsConfirmingSeek(true);
    const stepForToast = stepById.get(pendingSeek.stepId);
    const toastId = (seekToastCounterRef.current += 1);
    const toastMessage = stepForToast
      ? `Resuming from Step ${stepForToast.uiIndex}...`
      : "Resuming...";
    setSeekToast({ id: toastId, message: toastMessage });
    if (seekToastTimeoutRef.current != null) {
      window.clearTimeout(seekToastTimeoutRef.current);
    }
    seekToastTimeoutRef.current = window.setTimeout(() => {
      setSeekToast((prev) => (prev?.id === toastId ? null : prev));
    }, 1600);
    setPendingSeek(null);

    try {
      const targetStepId = pendingSeek.stepId;
      const { targetMs, reason } = resolveSeekTarget(
        { stepId: targetStepId, timeMs: pendingSeek.timeMs },
        currentTimeMs
      );

      if (targetMs != null) {
        const didSeek = seekWithFadeMs(targetMs);
        if (!didSeek) {
          console.warn("Seek skipped; audio not ready.", { reason });
        }
      } else {
        console.warn("Seek target unavailable; resume only.", { reason });
      }
      resumeFromStep(targetStepId);
    } catch (error) {
      console.error("Waveform confirm seek failed.", error);
    } finally {
      if (confirmingSeekIdRef.current === pendingSeek.id) {
        setIsConfirmingSeek(false);
        confirmingSeekIdRef.current = null;
      }
    }
  };

  return {
    stepById,
    isConfirmingSeek,
    seekToast,
    confirmingSeekIdRef,
    seekToastTimeoutRef,
    seekToastCounterRef,
    // resolveSeekTarget,
    onConfirmWaveSeek,
  };
}
