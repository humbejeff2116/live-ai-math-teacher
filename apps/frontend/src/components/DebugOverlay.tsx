import { useDebugState } from "../state/debugState";


export function DebugOverlay() {
  const { state } = useDebugState();

  if (!state.sessionStartedAt) return null;

  // TODO... fix bug - Error: Cannot call impure function during render
  //`Date.now` is an impure function. 
  // Calling an impure function can produce unstable results that update 
  // unpredictably when the component happens to re-render. 
  const uptime = Math.floor((Date.now() - state.sessionStartedAt) / 1000) + "s";

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        width: 280,
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        padding: 12,
        borderRadius: 8,
        fontSize: 13,
        zIndex: 9999,
      }}
    >
      <strong>🧠 Live Debug</strong>

      <div style={{ marginTop: 8 }}>
        <div>
          🔌 WS:{" "}
          <b style={{ color: state.connected ? "#1dd1a1" : "#ff6b6b" }}>
            {state.connected ? "Connected" : "Disconnected"}
          </b>
        </div>

        <div>⏱ Uptime: {uptime}</div>
        <div>💬 AI Messages: {state.aiMessageCount}</div>

        {state.lastLatencyMs && <div>⚡ Latency: {state.lastLatencyMs}ms</div>}

        {state.lastTranscript && (
          <div style={{ marginTop: 6 }}>
            🎤 Last Input:
            <div style={{ opacity: 0.85 }}>“{state.lastTranscript}”</div>
          </div>
        )}
      </div>
    </div>
  );
}
