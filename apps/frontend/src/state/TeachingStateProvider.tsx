import type { TeachingDebugState } from "@shared/types";
import { useState, type ReactNode } from "react";
import { TeachingStateContext } from "./teachingState";


export function TeachingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<TeachingDebugState | null>(null);

  return (
    <TeachingStateContext.Provider value={{ state, setState }}>
      {children}
    </TeachingStateContext.Provider>
  );
}
