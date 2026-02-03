import { useMemo, useRef, useState } from "react";
import type { WaveformPoint } from "../audio/audioTypes";
import type { StepAudioRange } from "@shared/types";
import { useOneShotHint } from "../hooks/useOneShotHint";

type Props = {
  waveform: WaveformPoint[];
  stepRanges: StepAudioRange[];
  stepIndexById?: Record<string, number>;
  durationMs: number;
  currentTimeMs: number;
  animatedStepId: string | null;
  hoverLabel?: string | null;
  hoverMs?: number | null;
  onHoverTime?: (ms: number | null) => void;
  onSeekRequest?: (payload: {
    ms: number;
    clientX: number;
    clientY: number;
  }) => void;
};

export function Waveform({
  waveform,
  stepRanges,
  stepIndexById,
  durationMs,
  currentTimeMs,
  animatedStepId,
  hoverLabel,
  hoverMs,
  onHoverTime,
  onSeekRequest,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const { visible: showScrubHint, showOnce: showScrubHintOnce } =
    useOneShotHint("waveformScrubHintSeen", 4500);
  const MIN_BAR_PCT = 3;
  const SNAP_THRESHOLD_SEC = 0.25;
  const animatedRange = useMemo(() => {
    if (!animatedStepId) return null;
    return stepRanges.find((r) => r.stepId === animatedStepId) ?? null;
  }, [animatedStepId, stepRanges]);

  const leftPct =
    animatedRange && durationMs > 0
      ? (animatedRange.startMs / durationMs) * 100
      : 0;

  const rightPct =
    animatedRange && durationMs > 0
      ? ((animatedRange.endMs ?? durationMs) / durationMs) * 100
      : 0;

  const widthPct = Math.max(0, rightPct - leftPct);
  // Calculate the percentage of the audio played
  const progressPercent =
    durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  const hoverPercent =
    hoverMs != null && durationMs > 0
      ? Math.min(100, Math.max(0, (hoverMs / durationMs) * 100))
      : null;
  const previewTimeSec = hoverMs != null ? hoverMs / 1000 : null;
  const getNearestStepBoundary = (
    previewSec: number | null,
  ): {
    stepId: string;
    stepIndex?: number;
    boundaryTimeSec: number;
    deltaSec: number;
  } | null => {
    if (previewSec == null) return null;
    let nearest: {
      stepId: string;
      stepIndex?: number;
      boundaryTimeSec: number;
      deltaSec: number;
    } | null = null;
    let nearestDelta = Number.POSITIVE_INFINITY;
    for (const range of stepRanges) {
      if (range.startMs == null) continue;
      const boundaryTimeSec = range.startMs / 1000;
      const deltaSec = previewSec - boundaryTimeSec;
      const absDelta = Math.abs(deltaSec);
      if (absDelta < nearestDelta) {
        nearestDelta = absDelta;
        nearest = {
          stepId: range.stepId,
          stepIndex: stepIndexById?.[range.stepId],
          boundaryTimeSec,
          deltaSec,
        };
      }
    }
    if (!nearest || nearestDelta > SNAP_THRESHOLD_SEC) return null;
    return nearest;
  };

  const nearestBoundary = getNearestStepBoundary(previewTimeSec);

  const hoverText = nearestBoundary
    ? `Jump to Step ${nearestBoundary.stepIndex ?? "?"}?`
    : hoverLabel && hoverPercent != null
      ? isDragging
        ? `Release to jump \u2014 ${hoverLabel}`
        : `Preview \u2014 ${hoverLabel}`
      : null;

  const boundaryPercents = useMemo(() => {
    if (durationMs <= 0 || stepRanges.length === 0) return [];
    const unique = new Set<number>();
    for (const range of stepRanges) {
      if (range.startMs == null) continue;
      const pct = Math.min(100, Math.max(0, (range.startMs / durationMs) * 100));
      unique.add(Math.round(pct * 100) / 100);
    }

    const sorted = Array.from(unique).sort((a, b) => a - b);

    if (sorted.length > 200) {
      const step = Math.ceil(sorted.length / 200);
      return sorted.filter((_, idx) => idx % step === 0);
    }
    return sorted;
  }, [durationMs, stepRanges]);

  const getMsFromClientX = (clientX: number, rect: DOMRect) => {
    const ratio = (clientX - rect.left) / rect.width;
    const clampedRatio = Math.min(1, Math.max(0, ratio));
    return Math.min(durationMs, Math.max(0, clampedRatio * durationMs));
  };

  return (
    <div
      style={{
        height: 80,
        width: "100%",
        position: "relative",
        display: "flex",
        alignItems: "flex-end",
        cursor: "crosshair",
        gap: 1,
        background: "rgba(0,0,0,0.03)",
        borderRadius: "8px",
        padding: "8px",
        overflow: "hidden",

        // makes pointer gestures reliable (esp. on touchpads/touch)
        touchAction: "none",

        // force interactivity even if some parent has odd styles
        pointerEvents: "auto",
      }}
      onPointerLeave={() => {
        isDraggingRef.current = false;
        onHoverTime?.(null);
        setIsDragging(false);
      }}
      onPointerMove={(e) => {
        showScrubHintOnce();
        const rect = e.currentTarget.getBoundingClientRect();
        const ms = getMsFromClientX(e.clientX, rect);
        onHoverTime?.(ms);
      }}
      onPointerDown={(e) => {
        showScrubHintOnce();
        isDraggingRef.current = true;
        setIsDragging(true);

        // capture so drag keeps working even if pointer crosses child bars
        e.currentTarget.setPointerCapture(e.pointerId);

        const rect = e.currentTarget.getBoundingClientRect();
        const ms = getMsFromClientX(e.clientX, rect);
        onHoverTime?.(ms);
      }}
      onPointerUp={(e) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);

        const rect = e.currentTarget.getBoundingClientRect();
        const ms = getMsFromClientX(e.clientX, rect);

        // “release to jump”
        onSeekRequest?.({
          ms,
          clientX: e.clientX,
          clientY: e.clientY,
        });

        // optional: keep hover line after seek
        onHoverTime?.(ms);

        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerCancel={() => {
        isDraggingRef.current = false;
        setIsDragging(false);
        onHoverTime?.(null);
      }}
    >

      <style>
        {`@keyframes magneticHint {
          0% { transform: translateX(-50%) scaleX(1); opacity: 0.7; }
          50% { transform: translateX(-50%) scaleX(1.6); opacity: 0.95; }
          100% { transform: translateX(-50%) scaleX(1); opacity: 0.7; }
        }`}
      </style>
      {animatedRange && (
        <div
          style={{
            position: "absolute",
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            top: 0,
            bottom: 0,
            borderRadius: 8,
            background: "rgba(99, 102, 241, 0.10)",
            boxShadow: "0 0 0 1px rgba(99, 102, 241, 0.25) inset",
            pointerEvents: "none",
            overflow: "hidden", // required for shimmer clipping
            animation: "pulseGlow 1.2s ease-in-out infinite",
            zIndex: 2,
          }}
        >
          {/* Shimmer sweep */}
          <div
            key={animatedStepId} // restart shimmer on step change
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "35%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
              filter: "blur(1px)",
              animation: "shimmerSweep 1.4s ease-in-out infinite",
            }}
          />
        </div>
      )}
      {boundaryPercents.length > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          {boundaryPercents.map((pct) => (
            <div
              key={pct}
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: 6,
                bottom: 6,
                width: 1,
                background: "rgba(15, 23, 42, 0.15)",
              }}
            />
          ))}
        </div>
      )}
      {showScrubHint && (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 8,
            padding: "4px 8px",
            fontSize: 11,
            borderRadius: 6,
            background: "rgba(15, 23, 42, 0.08)",
            color: "#0f172a",
            border: "1px solid rgba(15, 23, 42, 0.12)",
            pointerEvents: "none",
            zIndex: 12,
          }}
        >
          Scrub to preview, release to jump.
        </div>
      )}
      {hoverPercent != null && (
        <div
          style={{
            position: "absolute",
            left: `${hoverPercent}%`,
            top: 6,
            bottom: 6,
            width: 1,
            borderLeft: "1px dashed rgba(15, 23, 42, 0.35)",
            opacity: 0.7,
            zIndex: 9,
            pointerEvents: "none",
            transform: "translateX(-50%)",
            animation: nearestBoundary
              ? "magneticHint 0.9s ease-in-out infinite"
              : undefined,
            boxShadow: nearestBoundary
              ? "0 0 0 2px rgba(245,158,11,0.12)"
              : undefined,
          }}
        />
      )}
      {hoverText && (
        <div
          style={{
            position: "absolute",
            left: `${hoverPercent}%`,
            top: 0,
            transform: "translate(-50%, -110%)",
            padding: "4px 8px",
            fontSize: 12,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          {hoverText}
        </div>
      )}
      {/* Playhead Indicator */}
      <div
        style={{
          position: "absolute",
          left: `${progressPercent}%`,
          top: 0,
          bottom: 0,
          width: "2px",
          background: "#ef4444", // Red playhead
          zIndex: 10,
          pointerEvents: "none",
          transition: "left 0.1s linear",
        }}
      />

      {waveform.map((p, i) => {
        const timeAtBar = waveform[i]?.t ?? (i / waveform.length) * durationMs;
        const isPlayed = timeAtBar <= currentTimeMs;
        const hPct = Math.max(MIN_BAR_PCT, p.amp * 100);


        const activeRange = stepRanges.find(
          (r) => timeAtBar >= r.startMs && timeAtBar < (r.endMs ?? Infinity)
        );

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${hPct}%`,
              minWidth: 2, // Prevent flexbox from squashing it below 4px
              background: activeRange ? "#6366f1" : "#4ade80",
              opacity: isPlayed ? 1 : 0.6,
              borderRadius: "1px",
              transition: "opacity 0.2s ease",
              position: "relative",
              zIndex: 3,
            }}
          >
          </div>
        );
      })}
    </div>
  );
}
