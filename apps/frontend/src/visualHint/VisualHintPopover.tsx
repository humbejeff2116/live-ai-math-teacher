import { useEffect, useMemo, useRef, useState } from "react";
import type { VisualHintOverlayV1 } from "@shared/types";
import { VisualHintOverlayLayer } from "./VisualHintOverlayLayer";

export type VisualHintPopoverProps = {
  open: boolean;
  anchorRect: DOMRect | null;
  status: "idle" | "capturing" | "requesting" | "ready" | "error";
  errorMessage?: string | null;
  capture: { widthPx: number; heightPx: number } | null;
  captureDataUrl: string | null;
  overlay: VisualHintOverlayV1 | null;
  stepLabel?: string;
  onClose: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function VisualHintPopover({
  open,
  anchorRect,
  status,
  errorMessage,
  capture,
  captureDataUrl,
  overlay,
  stepLabel,
  onClose,
}: VisualHintPopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current && target && panelRef.current.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const canvasSize = useMemo(() => {
    const ratio =
      capture && capture.widthPx > 0
        ? capture.heightPx / capture.widthPx
        : 0.62;
    const idealWidth = clamp(viewport.width * 0.45, 360, 520);
    let width = idealWidth;
    let height = width * ratio;
    if (height < 220) {
      height = 220;
      width = height / ratio;
    }
    if (height > 320) {
      height = 320;
      width = height / ratio;
    }
    width = Math.min(width, viewport.width - 32);
    height = Math.min(height, viewport.height - 160);
    return { width, height };
  }, [capture, viewport.height, viewport.width]);

  const panelPosition = useMemo(() => {
    const gap = 12;
    const width = canvasSize.width + 24;
    const height = canvasSize.height + 128;

    if (!anchorRect) {
      return {
        left: clamp(viewport.width - width - 24, gap, viewport.width - width),
        top: clamp(80, gap, viewport.height - height - gap),
      };
    }

    const centeredTop = anchorRect.top + anchorRect.height / 2 - height / 2;
    const top = clamp(centeredTop, gap, viewport.height - height - gap);

    const rightLeft = anchorRect.right + gap;
    if (rightLeft + width <= viewport.width - gap) {
      return { left: rightLeft, top };
    }

    const leftLeft = anchorRect.left - gap - width;
    if (leftLeft >= gap) {
      return { left: leftLeft, top };
    }

    const belowTop = anchorRect.bottom + gap;
    return {
      left: clamp(anchorRect.left, gap, viewport.width - width - gap),
      top: clamp(belowTop, gap, viewport.height - height - gap),
    };
  }, [anchorRect, canvasSize.height, canvasSize.width, viewport.height, viewport.width]);

  if (!open) return null;

  const statusLabel =
    status === "capturing"
      ? "Capturing..."
      : status === "requesting"
        ? "Requesting..."
        : status === "ready"
          ? "Ready"
          : status === "error"
            ? "Error"
            : "Idle";

  const showCanvas =
    status === "ready" && capture && captureDataUrl && overlay;

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: panelPosition.left,
        top: panelPosition.top,
        width: canvasSize.width + 24,
        zIndex: 80,
        background: "white",
        border: "1px solid rgba(148,163,184,0.35)",
        borderRadius: 14,
        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            Visual hint {stepLabel ? `• ${stepLabel}` : ""}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            Status: {statusLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid rgba(148,163,184,0.35)",
            borderRadius: 8,
            fontSize: 12,
            padding: "4px 8px",
            color: "#0f172a",
            background: "#f8fafc",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>

      <div
        style={{
          position: "relative",
          width: canvasSize.width,
          height: canvasSize.height,
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,0.3)",
          background: "rgba(248,250,252,0.9)",
          overflow: "hidden",
        }}
      >
        {!showCanvas && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: status === "error" ? "#b91c1c" : "#64748b",
              fontSize: 12,
              fontWeight: 600,
              background:
                "linear-gradient(120deg, rgba(241,245,249,0.9) 0%, rgba(226,232,240,0.9) 50%, rgba(241,245,249,0.9) 100%)",
            }}
          >
            {status === "error"
              ? errorMessage ?? "Could not load hint."
              : "Preparing hint canvas..."}
          </div>
        )}

        {showCanvas && capture && captureDataUrl && overlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${captureDataUrl})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "100% 100%",
            }}
          >
            <VisualHintOverlayLayer overlay={overlay} capture={capture} />
          </div>
        )}
      </div>
    </div>
  );
}
