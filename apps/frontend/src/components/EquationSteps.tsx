type Props = {
  steps: {
    id: string;
    equation: string;
    description: string;
  }[];
};

export function EquationSteps({ steps }: Props) {
  return (
    <div style={{ marginTop: 16 }}>
      <h3>📐 Solution Steps</h3>

      {steps.map((step, idx) => (
        <div
          key={step.id}
          style={{
            padding: 8,
            marginTop: 8,
            background: "#111",
            borderRadius: 6,
          }}
        >
          <strong>Step {idx + 1}</strong>
          <div style={{ fontSize: 16, marginTop: 4 }}>{step.equation}</div>
        </div>
      ))}
    </div>
  );
}
