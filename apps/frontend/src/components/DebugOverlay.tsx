import { useEffect, useState } from "react";
import { useDebugState } from "../state/debugState";
// import { useWebSocketState } from "../state/weSocketState";
import { AlarmClock, ArrowDown01, Brain, CircleOff, Diff, Equal, MessageSquareText, Zap } from "lucide-react";


export function DebugOverlay() {
  // const { reconnect } = useWebSocketState()!;
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
        // border: "1px solid #ccc",
        borderRadius: "8px",
        position: "fixed",
        top: 16,
        right: 16,
        width: 280,
        background: "#ffffff",
        color: "#000",
        textAlign: "left",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",

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
            color: "#555",
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
        <div>
          <p
            style={{
              paddingTop: "5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderBottom: "1px solid #eee",
              paddingBottom: "5px",
            }}
          >
            <AlarmClock size={18} />
            Uptime: {uptime}
          </p>
          <p
            style={{
              paddingTop: "5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderBottom: "1px solid #eee",
              paddingBottom: "5px",
            }}
          >
            <MessageSquareText size={18} />
            AI Messages: {state.aiMessageCount}
          </p>
          <p
            style={{
              paddingTop: "5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderBottom: "1px solid #eee",
              paddingBottom: "5px",
            }}
          >
            <CircleOff size={18} />
            Interrupted: {state.interruptedCount}
          </p>
          <p
            style={{
              paddingTop: "5px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              borderBottom: "1px solid #eee",
              paddingBottom: "5px",
            }}
          >
            <Zap size={18} />
            Latency: {state.lastLatencyMs}ms
          </p>

          {state.lastEquationStep && (
            <>
              <hr />
              <p
                style={{
                  paddingTop: "5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                <strong>
                  <Diff size={18} />
                  Last Equation Step
                </strong>
              </p>
              <p
                style={{
                  paddingTop: "5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                <ArrowDown01 size={18} />
                Index: {state.lastEquationStep.index + 1}
              </p>
              <p
                style={{
                  paddingTop: "5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                <Equal size={18} />
                Type: {state.lastEquationStep.type}
              </p>
              <p
                style={{
                  paddingTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "4px",
                }}
              >
                <Brain size={18} />
                Confusion Detected: {state.confusionCount ?? 0}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
