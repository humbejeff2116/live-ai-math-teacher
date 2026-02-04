import React, { useMemo, useState, useRef } from "react";
import type { StepAudioRange } from "@shared/types";
import type { WaveformPoint } from "@/audio/audioTypes";
import { useOneShotHint } from "@/hooks/useOneShotHint";

interface WaveformProps {
  waveform: WaveformPoint[];
  durationMs: number;
  currentTimeMs: number;
  stepRanges: StepAudioRange[];
  stepIndexById: Record<string, number>;
  onHoverTime: (ms: number | null) => void;
  onSeekRequest: (payload: {
    ms: number;
    clientX: number;
    clientY: number;
  }) => void;
  hoverLabel?: string | null;
  hoverMs?: number | null;
  animatedStepId?: string | null;
}

export const Waveform: React.FC<WaveformProps> = ({
  waveform,
  durationMs,
  currentTimeMs,
  stepRanges,
  onHoverTime,
  onSeekRequest,
  hoverLabel,
  animatedStepId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Local hover state for buttery-smooth visual feedback
  const [localHoverMs, setLocalHoverMs] = useState<number | null>(null);
  const [localHoverX, setLocalHoverX] = useState<number>(0);
  const [localHoverTop, setLocalHoverTop] = useState<number>(0);
  const { visible: showScrubHint, showOnce: showScrubHintOnce } =
    useOneShotHint("waveformScrubHintSeen", 4500);

  // Prevent divide-by-zero
  const safeDuration = Math.max(durationMs, 1);
  const currentPercent = Math.min((currentTimeMs / safeDuration) * 100, 100);

  // Memoize bars to prevent heavy re-renders during mouse moves
  const renderedBars = useMemo(() => {
    if (waveform.length === 0) return null;
    return waveform.map((val, i) => {
      const height = Math.max(val.amp * 100, 4); // Min height of 4%
      return (
        <div
          key={i}
          className="bg-slate-300 transition-all duration-200"
          style={{
            height: `${height}%`,
            flex: 1,
            minWidth: 1,
            width: `${100 / waveform.length}%`,
            marginRight: "1px",
            borderRadius: "1px",
            opacity: (i / waveform.length) * 100 < currentPercent ? 1 : 0.4,
            backgroundColor:
              (i / waveform.length) * 100 < currentPercent
                ? "#6366f1"
                : "#5e8bc2",
          }}
        />
      );
    });
  }, [waveform, currentPercent]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    showScrubHintOnce()
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate values
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const ms = percent * safeDuration;

    console.log("[WaveForm] Pointer Move:", { x, percent, ms });
    console.log("[WaveForm] hoverLabel:", hoverLabel);

    // Capture position safely outside of the render cycle
    setLocalHoverMs(ms);
    setLocalHoverX(e.clientX);
    setLocalHoverTop(rect.top); // Capture the top of the waveform container
    
    onHoverTime(ms); 
  };

  const handlePointerLeave = () => {
    setLocalHoverMs(null);
    onHoverTime(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (localHoverMs === null) return;
    showScrubHintOnce()
    onSeekRequest({
      ms: localHoverMs,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  return (
    <div className="relative  w-full select-none overflow-hidden">
      {showScrubHint && localHoverMs == null && !hoverLabel && (
        <div
          className="pointer-events-none fixed z-[9999] -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-xl ring-1 ring-white/20"
          style={{
            left: 0 + "50%",
            top: localHoverTop - 35,
          }}
        >
          Scrub to preview, release to jump.{" "}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
      {/* Tooltip - Now uses the safely captured localHoverTop */}
      {localHoverMs !== null && hoverLabel && (
        <div
          className="pointer-events-none absolute z-[9999] -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-xl ring-1 ring-white/20"
          style={{
            left: localHoverX,
            top: localHoverTop - 35,
          }}
        >
          {hoverLabel}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}

      <div
        ref={containerRef}
        className="group relative h-12 w-full cursor-crosshair overflow-visible touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      >
        {/* Step Background Ranges */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {" "}
          {stepRanges.map((range) => {
            // Ensure we have a valid width
            const start = (range.startMs / safeDuration) * 100;
            const end =
              ((range.endMs ?? range.startMs + 100) / safeDuration) * 100;
            const width = Math.max(end - start, 0.5); // Ensure at least 0.5% width

            const isActive = animatedStepId === range.stepId;

            return (
              <div
                key={range.stepId}
                className="absolute h-full transition-all border-r border-indigo-500/20"
                style={{
                  left: `${start}%`,
                  width: `${width}%`,
                  backgroundColor: isActive
                    ? "rgb(99 102 241)"
                    : "rgb(148 163 184)",
                  opacity: isActive ? 0.25 : 0.1, // Increased visibility
                  visibility: width > 0 ? "visible" : "hidden",
                }}
              ></div>
            );
          })}
        </div>

        {/* Waveform Bars */}
        <div className="relative z-10 flex h-full w-full items-end px-1 gap-px">
          {renderedBars || <div className="h-[2px] w-full bg-slate-200" />}
        </div>

        {/* Progress Playhead */}
        <div
          className="absolute z-20 top-0 h-full w-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-all duration-75"
          style={{ left: `${currentPercent}%` }}
        />

        {/* Local Hover Line (The Scrubber) */}
        {localHoverMs !== null && (
          <div
            className="absolute z-20 top-0 h-full w-px bg-slate-400"
            style={{ left: `${(localHoverMs / safeDuration) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
};