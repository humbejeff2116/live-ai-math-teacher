export type TeachingMode =
  | "direct"
  | "step_by_step"
  | "analogy"
  | "visual"
  | "encouragement";

export type ConfusionLevel = "low" | "medium" | "high";

export interface TeachingState {
  equation: string;
  expectedAnswer: number;
  stepIndex: number;
  mode: TeachingMode;
  attempts: number;
  confusionLevel: ConfusionLevel;
  solved: boolean;
}
