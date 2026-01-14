import { useMemo, useState } from "react";
import { DebugContext, type DebugState } from "./debugState";

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DebugState>({
    connected: false,
    aiMessageCount: 0,
    interruptedCount: 0,
    lastLatencyMs: undefined,
    isReconnecting: false,
    // stepAudioRanges: [],
  });
  const value = useMemo(() => ({ state, setState }), [state]);

  return (
    <DebugContext.Provider value={{ state: value.state, setState: value.setState }}>
      {children}
    </DebugContext.Provider>
  );
}
