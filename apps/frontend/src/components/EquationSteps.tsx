import type { ReexplanStyle } from "@shared/types";
import type { UIEquationStep } from "../session/useLiveSession";
import { Fragment, useEffect } from "react";

type EquationStepsProps = {
  steps: UIEquationStep[];
  activeStepId?: string;
  previewStepId?: string;
  hoverStepId: string | null;
  animatedStepId: string | null;
  pendingStepId?: string;
  pendingStepLabel?: string;
  onReExplain: (id: string, style?: ReexplanStyle) => void;
  onStepClick?: (id: string, rect: DOMRect) => void;
  showHeader?: boolean;
};

export function EquationSteps({
  steps,
  activeStepId,
  previewStepId,
  hoverStepId,
  animatedStepId,
  pendingStepId,
  pendingStepLabel,
  onReExplain,
  onStepClick,
  showHeader = true,
}: EquationStepsProps) {
  useEffect(() => {
    if (!hoverStepId) return;

    document
      .getElementById(`step-${hoverStepId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hoverStepId]);

  return (
    <div className={showHeader ? "mt-4" : undefined}>
      <style>
        {`@keyframes pendingPulse {
          0% { background-color: rgba(99,102,241,0.04); }
          50% { background-color: rgba(99,102,241,0.1); }
          100% { background-color: rgba(99,102,241,0.04); }
        }`}
      </style>
      {showHeader && <h3>Solution Steps</h3>}

      {steps.map((step) => {
        const isActive = step.id === activeStepId;
        const isPreview = step.id === previewStepId && !isActive;
        const isHovered = step.id === hoverStepId && !isActive;
        const isPending = step.id === pendingStepId && !isActive;
        const isAnimated = step.id === animatedStepId;
        const audioBadge =
          step.audioStatus === "ready"
            ? {
                label: "Audio ready",
                background: "rgba(16,185,129,0.16)",
                color: "#047857",
                border: "1px solid rgba(16,185,129,0.35)",
              }
            : step.audioStatus === "buffering"
            ? {
                label: "Audio buffering",
                background: "rgba(245,158,11,0.16)",
                color: "#b45309",
                border: "1px solid rgba(245,158,11,0.35)",
              }
            : {
                label: "Audio pending",
                background: "rgba(148,163,184,0.16)",
                color: "#475569",
                border: "1px solid rgba(148,163,184,0.35)",
              };

        return (
          <Fragment key={step.id}>
            <div
              id={`step-${step.id}`}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                onStepClick?.(step.id, rect);
              }}
              style={{
                padding: 10,
                borderRadius: 10,
                position: "relative",
                cursor: onStepClick ? "pointer" : "default",
                textAlign: "left",
                borderLeft: isActive
                  ? "4px solid #22c55e"
                  : isPreview
                  ? "4px solid #60a5fa"
                  : isPending
                  ? "2px dashed rgba(99,102,241,0.5)"
                  : isHovered
                  ? "1px dashed rgba(99,102,241,0.35)"
                  : "4px solid transparent",
                background: isActive
                  ? "rgba(99,102,241,0.12)"
                  : isPreview
                  ? "#eff6ff"
                  : isPending
                  ? "rgba(99,102,241,0.04)"
                  : isHovered
                  ? "rgba(99,102,241,0.06)"
                  : "transparent",
                animation: isPending
                  ? "pendingPulse 2.1s ease-in-out infinite"
                  : isAnimated
                  ? "pulseGlow 1.2s ease-in-out infinite"
                  : undefined,
                transition: "background 120ms ease, border-color 120ms ease",
              }}
            >
              {isPending && pendingStepLabel && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    background: "rgba(99,102,241,0.12)",
                    color: "#4338ca",
                    border: "1px solid rgba(99,102,241,0.2)",
                    opacity: 1,
                    transition: "opacity 160ms ease",
                    pointerEvents: "none",
                  }}
                >
                  {pendingStepLabel}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>Step {step.uiIndex}</strong>
                {audioBadge && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: audioBadge.background,
                      color: audioBadge.color,
                      border: audioBadge.border,
                      fontWeight: 600,
                    }}
                  >
                    {audioBadge.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 16, marginTop: 4 }}>{step.equation}</div>
              <div style={{ opacity: 0.8 }}>{step.text}</div>

              <div style={{ marginTop: 6 }}>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onReExplain(step.id, "simpler");
                  }}
                  style={{
                    marginRight: 8,
                    color: "#2563eb",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid #2563eb",
                    background: "white",
                  }}
                >
                  Explain again
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onReExplain(step.id, "example");
                  }}
                  style={{
                    color: "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  With example
                </button>
              </div>
            </div>
            {isAnimated && (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#6366f1",
                  marginRight: 8,
                  animation: "pulseGlow 1.2s ease-in-out infinite",
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
