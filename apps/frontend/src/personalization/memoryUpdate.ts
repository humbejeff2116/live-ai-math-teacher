import type { PersonalizationMemory } from "./schema";

export type MemoryEvent =
  | { type: "confusion_confirmed"; stepId: string; atMs: number }
  | { type: "confusion_dismissed"; stepId: string; atMs: number }
  | { type: "reexplain_started"; stepId: string; atMs: number }
  | { type: "reexplain_completed"; stepId: string; atMs: number };

export function applyMemoryEvent(
  memory: PersonalizationMemory,
  _event: MemoryEvent,
): PersonalizationMemory {
  return {
    ...memory,
    updatedAtMs: Date.now(),
  };
}
