import { useState } from "react";
import { DebugOverlay } from "./DebugOverlay";

export function DebugToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <>
      <button
        onClick={() => setEnabled((v) => !v)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          padding: "8px 12px",
          borderRadius: 6,
        }}
      >
        {enabled ? "Hide Debug" : "Show Debug"}
      </button>

      {enabled && <DebugOverlay />}
    </>
  );
}
