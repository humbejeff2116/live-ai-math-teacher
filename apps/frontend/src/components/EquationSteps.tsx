import type { EquationStep, ReexplanStyle } from "@shared/types";

type EquationStepsProps = {
  steps: EquationStep[];
  activeStepId?: string;
  onReExplain: (id: string, style?: ReexplanStyle) => void;
};

export function EquationSteps({
  steps,
  activeStepId,
  onReExplain,
}: EquationStepsProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3>📐 Solution Steps</h3>

      {steps.map((step) => (
        <div
          key={step.id}
          style={{
            padding: 8,
            marginTop: 8,
            marginBottom: "6px",
            background:
              step.id === activeStepId ? "rgba(0,123,255,0.15)" : "transparent",
            border:
              step.id === activeStepId ? "1px solid #007bff" : "1px solid #ddd",
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
      ))}
    </div>
  );
}
