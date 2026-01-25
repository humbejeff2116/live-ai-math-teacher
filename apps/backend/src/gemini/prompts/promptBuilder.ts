import type { ConfusionReason, ConfusionSeverity, ConfusionSource, EquationStep } from "@shared/types";

export function buildFreshPrompt(userInput: string): string {
  return `
  You are a patient real-time math teacher.

  RESPONSE RULES (VERY IMPORTANT):
  - Explain in small steps.
  - For EACH step, you MUST include exactly ONE explicit equation containing "=" on its own line.
  - Keep explanations short (1–2 sentences) so the most recent 300 characters describe the current step.
  - Do NOT include any other "=" outside the equation line.
  - Avoid long paragraphs.

  FORMAT (repeat for each step):
  Step <number>:
  <equation with "=" on its own line>
  <1–2 short sentences>

  QUESTION:
  ${userInput}
  `.trim();
}

export function buildResumePrompt(
  userInput: string,
  lastStep: EquationStep,
  historySoFar: string,
): string {
  return `
  You are a patient real-time math teacher continuing an ongoing solution.

  RECENT CONTEXT:
  ${historySoFar.slice(-900)}

  LAST STEP COMPLETED:
  ${lastStep.equation}
  ${lastStep.text}

  STUDENT SAID:
  "${userInput}"

  INSTRUCTIONS:
  - Do NOT restart.
  - Decide if the student is correct.
    - If correct: confirm in one sentence, then move to the NEXT step.
    - If incorrect/confused: gently correct in one sentence, then re-explain the SAME step more simply.
  - In either case, you MUST include an equation containing "=" on its own line for the step you are teaching next.
  - Do NOT include any other "=" outside that equation line.
  - Keep explanations short (1-2 sentences).

  FORMAT:
  <one short confirmation/correction sentence>
  Step <number>:
  <equation with "=" on its own line>
  <1-2 short sentences>
  `.trim();
}

export function buildAdaptiveConfusionPrompt(args: {
  stepText: string;
  stepEquation: string;
  stepNumber: number;
  reason: ConfusionReason;
  severity: ConfusionSeverity;
  source: ConfusionSource;
  studentText?: string;
}) {
  const {
    stepText,
    stepEquation,
    stepNumber,
    reason,
    severity,
    source,
    studentText,
  } = args;

  const pace =
    reason === "pause" || reason === "hesitation" || severity === "high"
      ? "Go slower than before. Use short sentences. Pause after each sentence."
      : "Normal pace, but clearer than before.";

  const tone =
    severity === "high"
      ? "Be calm, reassuring, and confidence-building."
      : "Be encouraging and supportive.";

  const tactic =
    reason === "wrong_answer"
      ? "Correct gently. Give one small example that mirrors the step."
      : reason === "repeat_request"
        ? "Rephrase more simply. Do not add extra steps."
        : reason === "pause"
          ? "Assume they got stuck mid-thought. Re-explain the step and then ask ONE quick check question."
          : reason === "hesitation"
            ? "Use an analogy or visual mental model, then ask ONE quick check question."
            : "Re-explain the step in a simpler way, then ask ONE quick check question.";

  const studentContext = studentText?.trim()
    ? `Student said (from ${source}): "${studentText.trim()}"`
    : `Student signal source: ${source}. (No transcript provided.)`;

  return `
  You are a real-time, patient math teacher.

  The student showed confusion.
  Reason: ${reason}
  Severity: ${severity}

  We are currently on Step ${stepNumber}.
  Step explanation:
  ${stepText}

  Equation:
  ${stepEquation}

  ${studentContext}

  Instructions:
  - Re-explain ONLY this step (do not restart from the beginning).
  - ${pace}
  - ${tone}
  - ${tactic}
  - End with exactly ONE short question to confirm understanding.
  `.trim();
}

export function buildConfusionNudgePrompt(args: {
  stepNumber: number;
  reason: "pause" | "hesitation" | string;
  severity: "low" | "medium" | "high";
  source: ConfusionSource;
  studentText?: string;
  stepHintText?: string;
}) {
  const { stepNumber, reason, severity, source, studentText, stepHintText } =
    args;

  const vibe =
    reason === "hesitation"
      ? "It’s totally okay to take your time."
      : "No rush — we can do this together.";

  const hint = stepHintText?.trim()
    ? `We’re around step ${stepNumber}. Here’s the idea in words: ${stepHintText.trim()}`
    : `We’re around step ${stepNumber}.`;

  const student = studentText?.trim()
    ? `You said: "${studentText.trim()}".`
    : source === "voice"
      ? "I noticed you paused."
      : "I noticed you might be stuck.";

  return `
  You are a calm, friendly real-time math teacher.

  Rules:
  - Do NOT include equations or the "=" symbol.
  - Write 1–2 short sentences.
  - End with exactly ONE short question.

  Context:
  ${hint}
  ${student}
  Reason: ${reason}
  Severity: ${severity}

  Instructions:
  - Start with reassurance: "${vibe}"
  - Then ask ONE question: either "Which part feels unclear?" OR "Is it the simplification or the next move?"
  `.trim();
}

export function buildStepHintPrompt(args: {
  stepNumber: number;
  stepHintText: string;
  reason: ConfusionReason;
  severity: ConfusionSeverity;
  source: ConfusionSource;
  studentText?: string;
}) {
  const { stepNumber, stepHintText, reason, severity, source, studentText } =
    args;

  const student = studentText?.trim()
    ? `Student said (${source}): "${studentText.trim()}".`
    : "";

  return `
  You are a calm, friendly real-time math teacher.

  Rules:
  - Do NOT include equations or the "=" symbol.
  - Give ONE small hint only (not full solution).
  - 1–2 short sentences.
  - End with exactly ONE short question.

  Context:
  We are on step ${stepNumber}. Step idea (no equations): ${stepHintText.trim()}
  Reason: ${reason}
  Severity: ${severity}
  ${student}
  `.trim();
}

