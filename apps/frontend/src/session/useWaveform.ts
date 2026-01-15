import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { AudioStepTimeline } from "../audio/audioStepTimeLine";
import type { EquationStep } from "@shared/types/src/types";

export function useWaveform(
  timeline: AudioStepTimeline,
  equationSteps: EquationStep[],
  currentTimeMs: number,
  aiLifecycleTick: number,
) {
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [hoverStep, setHoverStep] = useState<EquationStep | null>(null);
  const [hoverStepId, setHoverStepId] = useState<string | null>(null);
  const [pendingSeek, setPendingSeek] = useState<{
    stepId: string;
    x: number;
    y: number;
    timeMs: number;
  } | null>(null);

  const previewStepId = useMemo(() => {
    if (hoverMs == null) return undefined;
    return timeline.getActiveStep(hoverMs);
  }, [hoverMs, timeline]);

  const handleHoverStep = useEffectEvent(
    (
      hoverMs: number | null,
      timeline: AudioStepTimeline,
      equationSteps: EquationStep[]
    ) => {
      if (hoverMs == null) {
        setHoverStepId(null);
        setHoverStep(null);
        return;
      }
      const stepId = timeline.getActiveStep(hoverMs);
      setHoverStepId(stepId ?? null);
      if (!stepId) {
        setHoverStep(null);
        return;
      }
      const step = equationSteps.find((s) => s.id === stepId) ?? null;
      setHoverStep(step);
    }
  );

  useEffect(() => {
    handleHoverStep(hoverMs, timeline, equationSteps);
  }, [hoverMs, timeline, equationSteps]);

  useEffect(() => {
    // Instead of setting state synchronously in the effect,
    // you can trigger a callback or handle this logic in an event handler.
    // If you want to "auto-cancel" pendingSeek when hoverStepId changes, use a timeout to avoid cascading renders.
    if (!pendingSeek) return;
    if (hoverStepId && hoverStepId !== pendingSeek.stepId) {
      // Use a microtask to defer setState and avoid cascading renders
      Promise.resolve().then(() => setPendingSeek(null));
    }
  }, [hoverStepId, pendingSeek]);

  useEffect(() => {
    if (pendingSeek) {
      Promise.resolve().then(() => setPendingSeek(null));
    }
  }, [aiLifecycleTick, pendingSeek]);

  const handleOnseekRequest = (payload: {
    ms: number;
    clientX: number;
    clientY: number;
  }) => {
    const clickedStepId = timeline.getActiveStep(payload.ms) ?? null;
    if (!clickedStepId) return;

    const currentStepId = timeline.getActiveStep(currentTimeMs) ?? null;
    if (clickedStepId === currentStepId) {
      setPendingSeek(null);
      return;
    }

    setPendingSeek({
      stepId: clickedStepId,
      x: payload.clientX,
      y: payload.clientY,
      timeMs: payload.ms,
    });
  };

  return {
    previewStepId,
    hoverStepId,
    hoverStep,
    hoverMs,
    pendingSeek,
    setHoverMs,
    setPendingSeek,
    handleOnseekRequest,
  };
}

export function resolveSeekStep(
  timeline: AudioStepTimeline,
  seekMs: number
): string | null {
  return timeline.getActiveStep(seekMs) ?? null;
}
