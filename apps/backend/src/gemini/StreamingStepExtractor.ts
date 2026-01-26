import { randomUUID } from "node:crypto";
import { EquationStep } from "@shared/types";

export class StreamingStepExtractor {
  private buffer = "";
  private steps: EquationStep[] = [];
  private stepIndex = 0;

  private lastEmittedEquationNorm: string | null = null;
  private emittedEquationNorms = new Set<string>();

  private static DEBUG_EQUATION_EXTRACTION = false;

  // How much recent text we keep around to scan for equations
  private static MAX_BUFFER_CHARS = 2500;

  pushText(delta: string): EquationStep | null {
    this.buffer += delta;

    // Keep buffer bounded (keep the most recent N chars)
    if (this.buffer.length > StreamingStepExtractor.MAX_BUFFER_CHARS) {
      this.buffer = this.buffer.slice(-StreamingStepExtractor.MAX_BUFFER_CHARS);
    }

    // Try to extract an equation step as soon as we see one
    const step = this.tryExtractStepFromBuffer(this.buffer);
    if (!step) return null;

    this.steps.push(step);
    return step;
  }

  private tryExtractStepFromBuffer(rawText: string): EquationStep | null {
    const sanitized = this.sanitize(rawText);

    // Find all equation candidates in the sanitized buffer
    const candidates = this.extractEquationCandidates(sanitized);
    if (candidates.length === 0) return null;

    // Prefer the earliest new equation in the stream
    let chosenEquation: string | null = null;
    let chosenNorm: string | null = null;

    for (const candidate of candidates) {
      const norm = this.normalizeEquation(candidate);
      if (!norm) continue;
      if (this.emittedEquationNorms.has(norm)) {
        if (StreamingStepExtractor.DEBUG_EQUATION_EXTRACTION) {
          console.log("[equation_deduped]", candidate);
        }
        continue;
      }
      chosenEquation = candidate;
      chosenNorm = norm;
      break;
    }

    if (!chosenEquation || !chosenNorm) return null;

    this.lastEmittedEquationNorm = chosenNorm;
    this.emittedEquationNorms.add(chosenNorm);

    if (StreamingStepExtractor.DEBUG_EQUATION_EXTRACTION) {
      console.log("[equation_extracted]", {
        equation: chosenEquation,
        index: this.stepIndex,
      });
    }

    // Keep the step text small and relevant: last ~300 chars of raw stream
    const textSnippet = rawText.slice(-300).trim();

    const step: EquationStep = {
      id: randomUUID(),
      index: this.stepIndex++,
      equation: chosenEquation,
      text: textSnippet.length > 0 ? textSnippet : rawText,
      type: this.inferType(rawText),
    };

    return step;
  }

  private inferType(text: string): EquationStep["type"] {
    const lower = text.toLowerCase();
    if (lower.includes("simplif")) return "simplify";
    if (
      lower.includes("therefore") ||
      lower.includes("so,") ||
      lower.includes("so ")
    )
      return "result";
    return "transform";
  }

  private sanitize(text: string): string {
    return (
      text
        // Remove latex delimiters
        .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
        .replace(/\$/g, " ")
        // Remove markdown wrappers
        .replace(/\*\*|__|`/g, " ")
        // Normalize unicode minus to hyphen
        .replace(/\u2212/g, "-")
        // Collapse whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  private extractEquationCandidates(text: string): string[] {
    // A “math token” is:
    // - numbers/operators/space/paren/decimal
    // - OR a single letter variable (not part of a word)
    //
    // This prevents matching "... = 9 - 3 Now" because "Now" is a word.
    const token = String.raw`(?:[0-9\s+\-*/^().]|[a-zA-Z](?![a-zA-Z]))+`;
    const re = new RegExp(`(${token}=${token})`, "g");

    const out: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      const candidate = (m[1] ?? "").trim();
      if (candidate.length < 5) continue;

      const cleaned = candidate.replace(/[.,;:!?]+$/, "").trim();
      if (!cleaned.includes("=")) continue;

      // Must have at least one digit or single-letter variable
      if (!/[0-9a-zA-Z]/.test(cleaned)) continue;

      out.push(cleaned);
    }

    return out;
  }

  private normalizeEquation(equation: string): string {
    return equation
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.,;:!?]+$/g, "")
      .trim();
  }

  reset() {
    this.buffer = "";
    this.steps = [];
    this.stepIndex = 0;
    this.lastEmittedEquationNorm = null;
    this.emittedEquationNorms.clear();
  }

  getSteps() {
    return [...this.steps];
  }
}
