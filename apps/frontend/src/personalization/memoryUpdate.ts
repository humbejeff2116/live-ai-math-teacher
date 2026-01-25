import type { StudentMemoryDoc } from "./schema";

export type MemoryEvent =
  | { type: "confusion_confirmed"; stepId: string; atMs: number }
  | { type: "confusion_dismissed"; stepId: string; atMs: number }
  | { type: "reexplain_started"; stepId: string; atMs: number }
  | { type: "reexplain_completed"; stepId: string; atMs: number };

export function applyMemoryEvent(
  memory: StudentMemoryDoc,
  _event: MemoryEvent,
): StudentMemoryDoc {
  return {
    ...memory,
    updatedAtMs: Date.now(),
  };
}
