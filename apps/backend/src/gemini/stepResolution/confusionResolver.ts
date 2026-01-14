import { EquationStep } from "@shared/types";
import { resolveStepFromText } from "./stepIntentResolver";

export function resolveConfusedStep(
  text: string,
  steps: EquationStep[],
  lastActiveStepId?: string | null
): EquationStep | null {
  // 1) Explicit reference
  const explicit = resolveStepFromText(text, steps);
  if (explicit) return explicit;

  // 2) Fall back to currently active step
  if (lastActiveStepId) {
    return steps.find((s) => s.id === lastActiveStepId) ?? null;
  }

  // 3) Fall back to last step
  return steps.at(-1) ?? null;
}
