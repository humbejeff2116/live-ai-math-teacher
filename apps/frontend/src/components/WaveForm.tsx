import { useMemo } from "react";
import type { WaveformPoint } from "../audio/audioTypes";
import type { StepAudioRange } from "@shared/types";

type Props = {
  waveform: WaveformPoint[];
  stepRanges: StepAudioRange[];
  durationMs: number;
  currentTimeMs: number;
  animatedStepId: string | null;
  hoverLabel?: string | null;
  hoverMs?: number | null;
  onHoverTime?: (ms: number | null) => void;
  onSeek?: (ms: number) => void;
};

export function Waveform({
  waveform,
  stepRanges,
  durationMs,
  currentTimeMs,
  animatedStepId,
  hoverLabel,
  hoverMs,
  onHoverTime,
  onSeek,
}: Props) {
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
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const seekMs = Math.min(durationMs, Math.max(0, ratio * durationMs));
        onSeek?.(seekMs);
      }}
    >
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
      {hoverLabel && hoverPercent != null && (
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
          {hoverLabel}
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
