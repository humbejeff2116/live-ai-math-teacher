import type { VisualHintOverlayV1, VisualHintTargetRef } from "@shared/types";

type VisualHintOverlayLayerProps = {
  overlay: VisualHintOverlayV1;
  capture: { widthPx: number; heightPx: number };
  requestId?: string;
};

type TargetRectPct = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

const clampPct = (value: number) => Math.min(1, Math.max(0, value));

const resolveTargetRect = (
  target: VisualHintTargetRef,
  capture: { widthPx: number; heightPx: number },
): TargetRectPct => {
  switch (target.kind) {
    case "bbox_px":
      return {
        xPct: clampPct(target.x / capture.widthPx),
        yPct: clampPct(target.y / capture.heightPx),
        wPct: clampPct(target.w / capture.widthPx),
        hPct: clampPct(target.h / capture.heightPx),
      };
    case "side":
      return {
        xPct: target.side === "lhs" ? 0.08 : 0.55,
        yPct: 0.2,
        wPct: 0.35,
        hPct: 0.6,
      };
    case "equals":
      return {
        xPct: 0.45,
        yPct: 0.35,
        wPct: 0.1,
        hPct: 0.3,
      };
    case "token":
    default:
      return {
        xPct: 0.3,
        yPct: 0.3,
        wPct: 0.4,
        hPct: 0.4,
      };
  }
};

const rectCenter = (rect: TargetRectPct) => ({
  xPct: rect.xPct + rect.wPct / 2,
  yPct: rect.yPct + rect.hPct / 2,
});

export function VisualHintOverlayLayer({
  overlay,
  capture,
  requestId,
}: VisualHintOverlayLayerProps) {
  const visualHintRequestId = requestId ?? overlay.requestId ?? "vh";

  return (
    <div
      data-visual-hint-overlay="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        {overlay.overlays.map((item, index) => {
          if (item.kind === "text") return null;
          if (item.kind === "arrow") {
            const fromRect = resolveTargetRect(item.from, capture);
            const toRect = resolveTargetRect(item.to, capture);
            const fromCenter = rectCenter(fromRect);
            const toCenter = rectCenter(toRect);
            const markerId = `vh-arrow-${visualHintRequestId}-${index}`;
            return (
              <g key={`${markerId}-arrow`}>
                <defs>
                  <marker
                    id={markerId}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M 0 0 L 10 5 L 0 10 z"
                      fill={item.color ?? "#f97316"}
                    />
                  </marker>
                </defs>
                <line
                  x1={fromCenter.xPct * 100}
                  y1={fromCenter.yPct * 100}
                  x2={toCenter.xPct * 100}
                  y2={toCenter.yPct * 100}
                  stroke={item.color ?? "#f97316"}
                  strokeWidth={item.thicknessPx ?? 2}
                  strokeOpacity={item.opacity ?? 0.9}
                  markerEnd={`url(#${markerId})`}
                />
              </g>
            );
          }

          const rect = resolveTargetRect(item.target, capture);
          const x = rect.xPct * 100;
          const y = rect.yPct * 100;
          const w = rect.wPct * 100;
          const h = rect.hPct * 100;
          const stroke = item.color ?? "#f97316";
          const strokeWidth = item.thicknessPx ?? 2;
          const opacity = item.opacity ?? 0.9;

          if (item.kind === "underline") {
            return (
              <line
                key={`vh-${index}`}
                x1={x}
                y1={y + h}
                x2={x + w}
                y2={y + h}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={opacity}
              />
            );
          }

          if (item.kind === "circle") {
            return (
              <ellipse
                key={`vh-${index}`}
                cx={x + w / 2}
                cy={y + h / 2}
                rx={w / 2}
                ry={h / 2}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={opacity}
              />
            );
          }

          if (item.kind === "brace") {
            return (
              <rect
                key={`vh-${index}`}
                x={x}
                y={y}
                width={w}
                height={h}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={opacity}
                strokeDasharray="4 3"
              />
            );
          }

          return (
            <rect
              key={`vh-${index}`}
              x={x}
              y={y}
              width={w}
              height={h}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
            />
          );
        })}
      </svg>

      {overlay.overlays.map((item, index) => {
        if (item.kind !== "text") return null;
        const rect = resolveTargetRect(item.target, capture);
        const anchor = item.anchor ?? {
          xPct: rect.xPct + rect.wPct / 2,
          yPct: Math.max(0.05, rect.yPct - 0.06),
        };
        return (
          <div
            key={`vh-text-${index}`}
            style={{
              position: "absolute",
              left: `${anchor.xPct * 100}%`,
              top: `${anchor.yPct * 100}%`,
              transform: "translate(-50%, -50%)",
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(251,146,60,0.5)",
              color: "#7c2d12",
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              maxWidth: "70%",
              boxShadow: "0 6px 14px rgba(15,23,42,0.12)",
            }}
          >
            {item.text}
          </div>
        );
      })}

      {overlay.ui.title && (
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            padding: "4px 8px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(251,146,60,0.15)",
            color: "#9a3412",
            border: "1px solid rgba(251,146,60,0.35)",
          }}
        >
          {overlay.ui.title}
        </div>
      )}
      {overlay.ui.subtitle && (
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 34,
            padding: "4px 8px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 600,
            background: "rgba(255,255,255,0.92)",
            color: "#7c2d12",
            border: "1px solid rgba(251,146,60,0.2)",
            maxWidth: "70%",
          }}
        >
          {overlay.ui.subtitle}
        </div>
      )}
    </div>
  );
}
