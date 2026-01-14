import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { AudioStepTimeline } from "../audio/audioStepTimeLine";
import type { EquationStep } from "@shared/types/src/types";

export function useWaveformStepPreview(timeline: AudioStepTimeline, equationSteps: EquationStep[]) {
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [hoverStep, setHoverStep] = useState<EquationStep | null>(null);
  const [hoverStepId, setHoverStepId] = useState<string | null>(null);

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

  return {
    previewStepId,
    hoverStepId,
    hoverStep,
    hoverMs,
    setHoverMs,
  };
}

export function resolveSeekStep(
  timeline: AudioStepTimeline,
  seekMs: number
): string | null {
  return timeline.getActiveStep(seekMs) ?? null;
}
