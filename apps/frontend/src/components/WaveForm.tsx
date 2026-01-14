import { useMemo } from "react";
import type { WaveformPoint } from "../audio/audioTypes";
import type { StepAudioRange } from "@shared/types";

type Props = {
  waveform: WaveformPoint[];
  stepRanges: StepAudioRange[];
  durationMs: number;
  currentTimeMs: number;
  animatedStepId: string | null;
  onHoverTime?: (ms: number | null) => void;
  onSeek?: (ms: number) => void;
};

export function Waveform({
  waveform,
  stepRanges,
  durationMs,
  currentTimeMs,
  animatedStepId,
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
        onHoverTime?.(Math.min(durationMs, Math.max(0, ratio * durationMs)));
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
            background: "rgba(99, 102, 241, 0.12)",
            boxShadow: "0 0 0 1px rgba(99, 102, 241, 0.25) inset",
            pointerEvents: "none",
            animation: "pulseGlow 1.2s ease-in-out infinite",
          }}
        />
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
              // Logic:
              // 1. If it's in the past: use full color
              // 2. If it's in the future: use lower opacity
              // 3. If it's a "Step": use Indigo, else Green
              background: activeRange ? "#6366f1" : "#4ade80",
              opacity: isPlayed ? 1 : 0.3,
              borderRadius: "1px",
              transition: "opacity 0.2s ease",
            }}
          />
        );
      })}
    </div>
  );
}
