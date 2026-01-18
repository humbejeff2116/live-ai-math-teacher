import { randomUUID } from "node:crypto";
import { EquationStep } from "@shared/types";

export class StreamingStepExtractor {
  private buffer = "";
  private steps: EquationStep[] = [];
  private stepIndex = 0;
  private static DEBUG_EQUATION_EXTRACTION = false;
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
    const sanitized = text
      .replace(/[*_`]/g, "")
      .split(/\r?\n/)[0]
      .trim();
    const equationMatch = sanitized.match(
      /([0-9a-zA-Z+\-*/\s]+=[0-9a-zA-Z+\-*/\s]+)/i
    );

    if (!equationMatch) return null;
    const equation = equationMatch[1].trim();
    if (StreamingStepExtractor.DEBUG_EQUATION_EXTRACTION) {
      console.log("[equation_extracted]", equation);
    }

    const step: EquationStep = {
      id: randomUUID(),
      index: this.stepIndex++,
      equation,
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
