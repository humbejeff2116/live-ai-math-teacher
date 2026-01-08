import { useState } from "react";
import { DebugOverlay } from "./DebugOverlay";

export function DebugToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          padding: "8px 12px",
          borderRadius: 6,
        }}
      >
        {open ? "Hide Debug" : "Show Debug"}
      </button>

      {open && <DebugOverlay />}
    </>
  );
}
