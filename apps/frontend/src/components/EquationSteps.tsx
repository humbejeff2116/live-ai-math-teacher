import type { EquationStep, ReexplanStyle } from "@shared/types";
import { useEffect } from "react";

type EquationStepsProps = {
  steps: EquationStep[];
  activeStepId?: string;
  previewStepId?: string;
  hoverStepId: string | null;
  onReExplain: (id: string, style?: ReexplanStyle) => void;
};

export function EquationSteps({
  steps,
  activeStepId,
  previewStepId,
  hoverStepId,
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
        const isHovered = step.id === hoverStepId;
        return (
          <div
            key={step.id}
            id={`step-${step.id}`}
            // className={cn(
            //   "equation-step",
            //   isActive && "equation-step--active",
            //   !isActive && isHovered && "equation-step--hover"
            // )}

            className={`equation-step 
              ${isActive && "equation-step--active"} 
              ${!isActive && isHovered && "equation-step--hover"}
            `}
            style={{
              padding: 8,
              // marginTop: 8,
              // marginBottom: "6px",
              borderLeft: isActive
                ? "4px solid #22c55e"
                : isPreview
                ? "4px solid #60a5fa"
                : "4px solid transparent",
              background: isActive
                ? "#ecfdf5"
                : isPreview
                ? "#eff6ff"
                : "transparent",
              borderRadius: 6,
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
        );
      })}
    </div>
  );
}
