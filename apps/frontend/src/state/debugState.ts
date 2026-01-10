import type { EquationStep } from "@shared/types";
import { createContext, useContext } from "react";

export type DebugState = {
  connected: boolean;
  lastTranscript?: string;
  aiMessageCount: number;
  lastLatencyMs?: number;
  sessionStartedAt?: number;
  interruptedCount: number;
  isReconnecting: boolean;
  lastEquationStep?: EquationStep;
};

export const DebugContext = createContext<{
  state: DebugState;
  setState: React.Dispatch<React.SetStateAction<DebugState>>;
} | null>(null);

export function useDebugState() {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error("DebugProvider missing");
  return ctx;
}
