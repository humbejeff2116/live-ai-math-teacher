import { EquationStep } from "@shared/types";

export function buildFreshPrompt(userInput: string): string {
  return `
You are a patient math teacher.
Explain step by step.
State equations explicitly.
Pause briefly between steps.

Question:
${userInput}
`.trim();
}

export function buildResumePrompt(
  userInput: string,
  lastStep?: EquationStep
): string {
  if (!lastStep) {
    return buildFreshPrompt(userInput);
  }

  return `
You were explaining a linear equation.

The last completed step was:
"${lastStep.description}"
Equation:
${lastStep.equation}

The student interrupted with:
"${userInput}"

Resume from this step.
Re-explain it clearly, then continue to the next step.
Do not restart from the beginning.
`.trim();
}
