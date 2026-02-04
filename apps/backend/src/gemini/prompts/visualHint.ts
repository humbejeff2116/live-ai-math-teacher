import { VisualHintRequestV1 } from "@shared/types";

export const SYSTEM_INSTRUCTION = `
You are a math tutor generating VISUAL HINT OVERLAY INSTRUCTIONS.
You must produce ONLY strict JSON that matches the VisualHintOverlayV1 schema.
Never include the final answer or numeric solution.
Never reveal the next step explicitly.
Hints must be visual, short, and non-spoilery.
If unsure, use a simple highlight or arrow with minimal text.
`.trim();

export function buildUserPrompt(request: VisualHintRequestV1) {
  return [
    "Return ONLY valid JSON. No markdown. No commentary.",
    "Schema: VisualHintOverlayV1.",
    "Request JSON:",
    JSON.stringify(request),
  ].join("\n");
}