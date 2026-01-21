import { useState } from "react";
import { DebugOverlay } from "./DebugOverlay";
import { Bug } from "lucide-react";

export function DebugToggle() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          color: open ? "white" : "#374151",
          background: hovered
            ? open
              ? "#111827"
              : "#f9fafb"
            : open
            ? "#111827"
            : "white",
          border: open ? "none" : "1px solid #d1d5db",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        <Bug size={18}/>
        {open ? "Hide Debug" : "Show Debug"}
      </button>

      {open && <DebugOverlay />}
    </>
  );
}
