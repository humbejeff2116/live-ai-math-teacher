import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { AudioStepTimeline } from "../audio/audioStepTimeLine";
// import type { EquationStep } from "@shared/types/src/types";
import type { UIEquationStep } from "./useLiveSession";


export type PendingSeek = {
  id: number;
  stepId: string;
  x: number;
  y: number;
  timeMs?: number;
};

export function useWaveform(
  timeline: AudioStepTimeline,
  equationSteps: UIEquationStep[],
  currentTimeMs: number,
  aiLifecycleTick: number,
  // timelineTick: number,
) {
  const isDev = import.meta.env.MODE !== "production";
  const [hoverMs, setHoverMs] = useState<number | null>(null);
  const [pendingSeek, setPendingSeek] = useState<PendingSeek | null>(null);
  const pendingSeekCounterRef = useRef(0);

  useEffect(() => {
    if (isDev && equationSteps.length > 0) {
      const timelineIds = timeline.getRanges().map((r) => r.stepId);
      const stepIds = equationSteps.map((s) => s.id);

      console.log("--- ID SYNC CHECK ---");
      console.log("Timeline IDs:", timelineIds);
      console.log("EquationStep IDs:", stepIds);
      console.log(
        "Intersection:",
        timelineIds.filter((id) => stepIds.includes(id)),
      );
    }
  }, [aiLifecycleTick, equationSteps, isDev, timeline]);

  const hoverStepId = useMemo(() => {
    console.log("[useWaveform] hoverMs:", hoverMs);
    if (hoverMs == null) return null;
    // Use the new lenient lookup
    const id = timeline.getNearestStep(hoverMs);
    return id ?? null;
  }, [hoverMs, timeline, aiLifecycleTick]);

  const hoverStep = useMemo(() => {
    if (!hoverStepId) return null;
    const step = equationSteps.find((s) => s.id === hoverStepId);

    if (!step) {
      console.warn(
        `[Hook] Found ID ${hoverStepId} in Timeline, but not in equationSteps!`,
      );
    }
    return step ?? null;
  }, [hoverStepId, equationSteps]);

  // Log this to confirm it's now finding steps!
  if (isDev && hoverMs !== null) {
    console.log("=== [useWaveform] Debug Info ===");
    console.log("hoverStep:", hoverStep);
    console.log("Timeline Status:", {
      rangesCount: timeline.getRanges().length,
      totalTimelineMs: timeline.getTotalDurationMs(),
      // incomingDurationMs: durationMs,
    });
    console.log(
      `[useWaveform] Hovering ${hoverMs.toFixed(2)}ms -> Found: ${hoverStepId}`,
    );
  }

  const handleSetPendingSeek = useEffectEvent(
    (pendingSeek: PendingSeek | null) => {
      setPendingSeek(pendingSeek);
    },
  );

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
    if (isDev) {
      console.log("[useWaveform] onSeekRequest", payload);
    }
    const clickedStepId = timeline.getActiveStep(payload.ms) ?? null;
    if (!clickedStepId) return;

    const currentStepId = timeline.getActiveStep(currentTimeMs) ?? null;
    if (clickedStepId === currentStepId) {
      setPendingSeek(null);
      return;
    }

    pendingSeekCounterRef.current += 1;
    const nextPending = {
      id: pendingSeekCounterRef.current,
      stepId: clickedStepId,
      x: payload.clientX,
      y: payload.clientY,
      timeMs: payload.ms,
    };
    setPendingSeek(nextPending);
    if (isDev) {
      console.log("[useWaveform] pendingSeek", nextPending);
    }
  };

  return {
    previewStepId: hoverStepId,
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
