import { useEffect, useState } from "react";
import { useDebugState } from "../state/debugState";
import { useWebSocketState } from "../state/weSocketState";


export function DebugOverlay() {
  const { reconnect } = useWebSocketState()!;
  const { state } = useDebugState();
  const [uptime, setUptime] = useState("0s");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let interval = null;

    if (!state.sessionStartedAt) return;
    if (state.connected && !state.isReconnecting) {
      interval = setInterval(() => {
        const seconds = Math.floor(
          (Date.now() - Number(state.sessionStartedAt)) / 1000
        );
        setUptime(`${seconds}s`);
      }, 1000);

    } else {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    }
  }, [state.connected, state.isReconnecting, state.sessionStartedAt]);

  // const activeStepId = stepTimeline.getActiveStep(currentTimeMs);

  if (!state.sessionStartedAt) return null;

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        position: "fixed",
        top: 16,
        right: 16,
        width: 280,
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        // padding: 12,
        // borderRadius: 8,
        fontSize: 13,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <h3 style={{ margin: 0 }}>Debug Info</h3>

        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: "transparent",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {!collapsed && (
        <>
          <p>
            Status:
            <span style={{ color: state.connected ? "green" : "red" }}>
              {state.connected ? " ● Connected" : " ○ Disconnected"}
            </span>
          </p>

          <button
            onClick={reconnect}
            style={{
              marginTop: "8px",
              padding: "4px 12px",
              cursor: "pointer",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Force Reconnect
          </button>

          <hr />

          <p>⏱ Uptime: {uptime}</p>
          <p>💬 AI Messages: {state.aiMessageCount}</p>
          <p>🛑 Interrupted: {state.interruptedCount}</p>
          <p>⚡ Latency: {state.lastLatencyMs}ms</p>

          {state.lastEquationStep && (
            <>
              <hr />
              <p>
                <strong>📐 Last Equation Step</strong>
              </p>
              <p>Index: {state.lastEquationStep.index + 1}</p>
              <p>Type: {state.lastEquationStep.type}</p>
              <p style={{ opacity: 0.8 }}>{state.lastEquationStep.type}</p>
              {/* <p>📘 Active Step: {state.activeStepId ?? "None"}</p> */}
              <p>🧠 Confusion Detected: {state.confusionCount ?? 0}</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
