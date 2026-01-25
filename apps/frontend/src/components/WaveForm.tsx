import { useMemo, useState } from "react";
import type { WaveformPoint } from "../audio/audioTypes";
import type { StepAudioRange } from "@shared/types";

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

  return (
    <div
      style={{
        height: 80, // Increased slightly for better visibility
        position: "relative",
        display: "flex",
        alignItems: "flex-end",
        cursor: "crosshair",
        gap: 1,
        background: "rgba(0,0,0,0.03)",
        borderRadius: "8px",
        padding: "8px",
        overflow: "hidden",
      }}
      onMouseLeave={() => onHoverTime?.(null)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const clampedRatio = Math.min(1, Math.max(0, ratio));
        onHoverTime?.(Math.min(durationMs, Math.max(0, clampedRatio * durationMs)));
      }}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeaveCapture={() => setIsDragging(false)}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const seekMs = Math.min(durationMs, Math.max(0, ratio * durationMs));
        onSeekRequest?.({
          ms: seekMs,
          clientX: e.clientX,
          clientY: e.clientY,
        });
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
            overflow: "hidden", // ✅ required for shimmer clipping
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
        const timeAtBar = (i / waveform.length) * durationMs;
        const isPlayed = timeAtBar <= currentTimeMs;

        const activeRange = stepRanges.find(
          (r) => timeAtBar >= r.startMs && timeAtBar < (r.endMs ?? Infinity)
        );

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${p.amp * 100}%`,
              background: activeRange ? "#6366f1" : "#4ade80",
              opacity: isPlayed ? 1 : 0.3,
              borderRadius: "1px",
              transition: "opacity 0.2s ease",
              position: "relative",
              zIndex: 3,
            }}
          />
        );
      })}
    </div>
  );
}
