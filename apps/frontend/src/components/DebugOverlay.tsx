import { useTeachingState } from "../state/teachingState";

export function DebugOverlay() {
  const { state } = useTeachingState();

  if (!state) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        width: 260,
        padding: 12,
        background: "rgba(0,0,0,0.8)",
        color: "#fff",
        borderRadius: 8,
        fontSize: 13,
        zIndex: 9999,
      }}
    >
      <strong>🧠 AI Teaching State</strong>

      <div style={{ marginTop: 8 }}>
        <div>
          📘 Mode: <b>{state.mode}</b>
        </div>
        <div>
          😕 Confusion:{" "}
          <b
            style={{
              color:
                state.confusionLevel === "high"
                  ? "#ff6b6b"
                  : state.confusionLevel === "medium"
                  ? "#feca57"
                  : "#1dd1a1",
            }}
          >
            {state.confusionLevel}
          </b>
        </div>
        <div>🔁 Attempts: {state.attempts}</div>
        <div>✅ Solved: {state.solved ? "Yes" : "No"}</div>
      </div>
    </div>
  );
}
