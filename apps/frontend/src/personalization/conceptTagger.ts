import type { EquationStep } from "@shared/types";

export type ConceptTag = string;

export type ConceptTagInput = Pick<EquationStep, "text" | "equation" | "type">;

// TODO: Implement heuristics; return empty for now to avoid behavior changes.
export function tagConceptsForStep(_step: ConceptTagInput): ConceptTag[] {
  return [];
}
