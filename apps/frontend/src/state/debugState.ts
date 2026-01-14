import type { EquationStep } from "@shared/types";
import { createContext, useContext } from "react";

export type StepAudioMarker = {
  stepId: string;
  atMs: number;
};

export type DebugState = {
  lastLatencyMs?: number;
  sessionStartedAt?: number;
  reexplainedStepIndex?: number;
  confusionHandledStepIndex?: number;
  connected: boolean;
  aiMessageCount: number;
  interruptedCount: number;
  isReconnecting: boolean;
  lastEquationStep?: EquationStep;
  // stepAudioRanges: StepAudioRange[];
  // activeStepId?: string;
  confusionCount?: number;
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
