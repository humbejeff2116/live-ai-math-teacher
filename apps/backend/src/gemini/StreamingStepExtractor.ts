import { randomUUID } from "node:crypto";
import { EquationStep } from "@shared/types";

export class StreamingStepExtractor {
  private buffer = "";
  private steps: EquationStep[] = [];
  private stepIndex = 0;
  // private lastStep: EquationStep | null = null;

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
    const equationMatch = text.match(
      /([0-9a-zA-Z+\-*/\s=]+=[0-9a-zA-Z+\-*/\s]+)/i
    );

    if (!equationMatch) return null;

    const step: EquationStep = {
      id: randomUUID(),
      index: this.stepIndex++,
      equation: equationMatch[1].trim(),
      text: text,
      type: text.includes("simplify")
        ? "simplify"
        : text.includes("therefore") || text.includes("so")
        ? "result"
        : "transform",
    };

    // this.lastStep = step;
    return step;
  }

  // getLastStep() {
  //   return this.lastStep;
  // }

  reset() {
    this.buffer = "";
    this.steps = [];
    this.stepIndex = 0;
    // this.lastStep = null;
  }

  getSteps() {
    return [...this.steps];
  }
}
