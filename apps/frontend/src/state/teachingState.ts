import { createContext, useContext } from "react";
import type { TeachingDebugState } from "@shared/types";
 
// export type TeachingDebugState = {
//   mode: string;
//   confusionLevel: string;
//   attempts: number;
//   solved: boolean;
//   equation?: string;
// };

export const TeachingStateContext = createContext<{
  state: TeachingDebugState | null;
  setState: (s: TeachingDebugState) => void;
} | null>(null);

export function useTeachingState() {
  const ctx = useContext(TeachingStateContext);
  if (!ctx) {
    throw new Error("TeachingStateProvider missing");
  }
  return ctx;
}
