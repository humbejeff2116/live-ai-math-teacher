import type { EquationStep, ReexplanStyle } from "@shared/types";
import { useEffect } from "react";

type EquationStepsProps = {
  steps: EquationStep[];
  activeStepId?: string;
  previewStepId?: string;
  hoverStepId: string | null;
  animatedStepId: string | null;
  pendingStepId?: string;
  onReExplain: (id: string, style?: ReexplanStyle) => void;
};

export function EquationSteps({
  steps,
  activeStepId,
  previewStepId,
  hoverStepId,
  animatedStepId,
  pendingStepId,
  onReExplain,
}: EquationStepsProps) {

  useEffect(() => {
    if (!hoverStepId) return;

    document
      .getElementById(`step-${hoverStepId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [hoverStepId]);
  
  return (
    <div style={{ marginTop: 16 }}>
      <h3>📐 Solution Steps</h3>

      {steps.map((step) => {
        const isActive = step.id === activeStepId;
        const isPreview = step.id === previewStepId && !isActive;
        const isHovered = step.id === hoverStepId && !isActive;
        const isPending = step.id === pendingStepId && !isActive;
        const isAnimated = step.id === animatedStepId;

        return (
          <>
            <div
              key={step.id}
              id={`step-${step.id}`}
              // className={cn(
              //   "equation-step",
              //   isActive && "equation-step--active",
              //   !isActive && isHovered && "equation-step--hover"
              // )}

              // className={`equation-step
              //   ${isActive && "equation-step--active"}
              //   ${!isActive && isHovered && "equation-step--hover"}
              // `}

              style={{
                padding: 10,
                borderRadius: 10,
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
                animation: isAnimated
                  ? "pulseGlow 1.2s ease-in-out infinite"
                  : undefined,
                transition: "background 120ms ease, border-color 120ms ease",
              }}
            >
              <strong>Step {step.index + 1}</strong>
              <div style={{ fontSize: 16, marginTop: 4 }}>{step.equation}</div>
              <div style={{ opacity: 0.8 }}>{step.text}</div>

              <div style={{ marginTop: 6 }}>
                <button onClick={() => onReExplain(step.id, "simpler")}>
                  Explain again
                </button>
                <button onClick={() => onReExplain(step.id, "example")}>
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
          </>
        );
      })}
    </div>
  );
}
