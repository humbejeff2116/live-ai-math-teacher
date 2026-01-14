import { EquationStep } from "@shared/types";

export function resolveStepFromText(
  text: string,
  steps: EquationStep[]
): EquationStep | null {
  const lower = text.toLowerCase();

  // 1) Explicit numeric reference
  const numberMatch =
    lower.match(/step\s*(\d+)/) || lower.match(/(\d+)(st|nd|rd|th)\s*step/);

  if (numberMatch) {
    const index = Number(numberMatch[1]) - 1;
    return steps[index] ?? null;
  }

  // 2) Positional references
  if (lower.includes("last step") || lower.includes("previous step")) {
    return steps.at(-1) ?? null;
  }

  if (lower.includes("first step")) {
    return steps[0] ?? null;
  }

  // 3) Semantic keyword match
  for (const step of steps) {
    if (lower.includes("simplify") && step.type === "simplify") {
      return step;
    }

    if (lower.includes("result") && step.type === "result") {
      return step;
    }

    if (lower.includes(step.equation.toLowerCase())) {
      return step;
    }
  }

  return null;
}
