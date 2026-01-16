import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { AudioStepTimeline } from "../audio/audioStepTimeLine";
import type { EquationStep } from "@shared/types/src/types";


export type PendingSeek = {
  id: number;
  stepId: string;
  x: number;
  y: number;
  timeMs?: number;
};

export function useWaveform(
  timeline: AudioStepTimeline,
  equationSteps: EquationStep[],
  currentTimeMs: number,
  aiLifecycleTick: number,
) {
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [hoverStep, setHoverStep] = useState<EquationStep | null>(null);
  const [hoverStepId, setHoverStepId] = useState<string | null>(null);
  const [pendingSeek, setPendingSeek] = useState<PendingSeek | null>(null);
  const pendingSeekCounterRef = useRef(0);

  const previewStepId = useMemo(() => {
    if (hoverMs == null) return undefined;
    return timeline.getActiveStep(hoverMs);
  }, [hoverMs, timeline]);

  const handleHoverStep = useEffectEvent((
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
  });

  useEffect(() => {
    handleHoverStep(hoverMs, timeline, equationSteps);
  }, [hoverMs, timeline, equationSteps]);

  const handleSetPendingSeek = useEffectEvent((
    pendingSeek: PendingSeek | null
  ) => {
    setPendingSeek(pendingSeek);
  });

  const handleSetPendingSeekByStep = (payload: {
    stepId: string;
    clientX: number;
    clientY: number;
  }) => {
    const rangeStartMs = timeline.getRangeForStep(payload.stepId)?.startMs;
    const timeMs = Number.isFinite(rangeStartMs) ? rangeStartMs : currentTimeMs;

    pendingSeekCounterRef.current += 1;
    setPendingSeek({
      id: pendingSeekCounterRef.current,
      stepId: payload.stepId,
      x: payload.clientX,
      y: payload.clientY,
      timeMs: timeMs,
    });
  };

  useEffect(() => {
    if (!pendingSeek) return;
    if (hoverStepId && hoverStepId !== pendingSeek.stepId) {
      handleSetPendingSeek(null);
    }
  }, [hoverStepId, pendingSeek]);

  useEffect(() => {
    if (pendingSeek) {
      handleSetPendingSeek(null);
    }
  }, [aiLifecycleTick]);

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

    pendingSeekCounterRef.current += 1;
    setPendingSeek({
      id: pendingSeekCounterRef.current,
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
    handleSetPendingSeekByStep,
  };
}

export function resolveSeekStep(
  timeline: AudioStepTimeline,
  seekMs: number
): string | null {
  return timeline.getActiveStep(seekMs) ?? null;
}
