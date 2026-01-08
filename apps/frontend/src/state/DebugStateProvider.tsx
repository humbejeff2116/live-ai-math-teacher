import { useState } from "react";
import { DebugContext, type DebugState } from "./debugState";

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DebugState>({
    connected: false,
    aiMessageCount: 0,
  });

  return (
    <DebugContext.Provider value={{ state, setState }}>
      {children}
    </DebugContext.Provider>
  );
}
