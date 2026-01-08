import { ConfusionLevel } from "../types/teaching";

export interface ConfusionSignals {
  silenceMs: number;
  incorrect: boolean;
  repeatedMistake: boolean;
  explicitConfusion: boolean;
}

export function calculateConfusionLevel(
  previous: ConfusionLevel,
  signals: ConfusionSignals
): ConfusionLevel {
  let score = 0;

  if (signals.silenceMs > 4000) score += 1;
  if (signals.incorrect) score += 1;
  if (signals.repeatedMistake) score += 2;
  if (signals.explicitConfusion) score += 2;

  if (score <= 1) return "low";
  if (score <= 3) return "medium";
  return "high";
}
