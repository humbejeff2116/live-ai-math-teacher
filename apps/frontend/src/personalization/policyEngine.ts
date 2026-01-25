import type { PersonalizationMemory } from "./schema";

export type PolicyDecision = {
  // TODO: add decision fields for guidance/style adjustments.
};

export function evaluatePolicy(_memory: PersonalizationMemory): PolicyDecision {
  return {};
}
