import type { EquationStep } from "@shared/types";

type Props = {
  step: EquationStep;
  position: { x: number; y: number };
  onConfirm: () => void;
  onCancel: () => void;
};

function getPreview(text: string, limit = 90) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}...`;
}

export function WaveSeekConfirm({
  step,
  position,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      style={{
        position: "fixed",
        left: position.x + 12,
        top: position.y + 12,
        zIndex: 50,
        width: 260,
        padding: 12,
        borderRadius: 10,
        background: "white",
        border: "1px solid rgba(15, 23, 42, 0.12)",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        Step {step.index + 1} - {step.type}
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
        {getPreview(step.text)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onConfirm}>Resume here</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
