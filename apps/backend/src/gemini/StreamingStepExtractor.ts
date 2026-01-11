import { randomUUID } from "crypto";
import { EquationStep } from "@shared/types";

const STEP_BOUNDARIES = ["now", "next", "then", "so", "therefore", "we get"];

export class StreamingStepExtractor {
  private buffer = "";
  private steps: EquationStep[] = [];

  pushText(delta: string): EquationStep | null {
    this.buffer += delta;

    // Heuristic: step completed when Gemini finishes a sentence
    if (!this.buffer.match(/[.!?]\s*$/)) {
      return null;
    }

    const sentence = this.buffer.trim();
    this.buffer = "";

    const extracted = this.tryExtractStep(sentence);
    if (!extracted) return null;

    this.steps.push(extracted);
    return extracted;
  }

  private tryExtractStep(text: string): EquationStep | null {
    // Very intentional: we don't overfit
    const equationMatch = text.match(
      /([0-9a-zA-Z+\-*/\s=]+=[0-9a-zA-Z+\-*/\s]+)/i
    );

    if (!equationMatch) return null;

    return {
      id: randomUUID(),
      description: text,
      equation: equationMatch[1].trim(),
    };
  }

  reset() {
    this.buffer = "";
    this.steps = [];
  }

  getSteps() {
    return [...this.steps];
  }
}
