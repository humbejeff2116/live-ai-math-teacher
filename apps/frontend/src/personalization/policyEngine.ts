import type { StudentMemoryDoc } from "./schema";

export type PolicyDecision = {
  // TODO: add decision fields for guidance/style adjustments.
};

export function evaluatePolicy(_memory: StudentMemoryDoc): PolicyDecision {
  return {};
}
