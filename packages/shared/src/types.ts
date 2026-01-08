export type TeachingDebugState = {
  mode: "direct" | "guided" | "analogy" | "stepwise";
  confusionLevel: "low" | "medium" | "high";
  attempts: number;
  solved: boolean;
  equation: string;
};

export type InteractionRequest = {
  sessionId: string;
  transcript: string;
  silenceMs: number;
};

export type InteractionResponse = TeachingDebugState;
