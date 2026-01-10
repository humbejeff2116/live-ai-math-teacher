import { useEffect, useRef, useState } from "react";
import { useDebugState } from "../state/debugState";


export function ConnectionToast() {
  const { state } = useDebugState();
  const [visible, setVisible] = useState(false);

  // Use a ref to track if this is the first time the component is mounting
  const isFirstRender = useRef(true);
  // useEffect(() => {
  //   if(state.isReconnecting) {
  //     setVisible(true);
  //   }
  // }, [state.isReconnecting])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Always show the toast if we start reconnecting or status changes
    setVisible(true);

    // Only set a hide timer if we are successfully connected
    if (state.connected) {
      // const timer = setTimeout(() => setVisible(false), 3000);
      // return () => clearTimeout(timer);
    }

    // If disconnected and NOT reconnecting, hide after 5 seconds
    if (!state.connected && !state.isReconnecting) {
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.connected, state.isReconnecting]);

  if (!visible) return null;

  // Determine status color and text
  const getStatusConfig = () => {
    if (state.connected)
      return { color: "#2ecc71", text: "Back Online", icon: "●" };
    if (state.isReconnecting)
      return { color: "#f39c12", text: "Reconnecting...", icon: "spinner" };
    return { color: "#e74c3c", text: "Connection Lost", icon: "○" };
  };

  const config = getStatusConfig();

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        padding: "10px 20px",
        borderRadius: "28px",
        color: "white",
        fontWeight: "bold",
        zIndex: 1000,
        backgroundColor: state.connected ? "#2ecc71" : "#e74c3c",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        // opacity: visible ? 1 : 0,
        // transform: visible ? "translateY(0)" : "translateY(-20px)",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
    >
      {config.icon === "spinner" ? (
        <div className="reconnect-spinner" />
      ) : (
        <span>{config.icon}</span>
      )}
      <span>{config.text}</span>
    </div>
  );
}
