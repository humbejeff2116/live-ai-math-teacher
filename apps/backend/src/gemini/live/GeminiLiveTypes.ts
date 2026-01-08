export type GeminiMediaChunk =
  | { type: "audio"; data: ArrayBuffer }
  | { type: "video"; data: ArrayBuffer }
  // | { type: "event"; name: string };

export interface GeminiLiveConfig {
  systemPrompt: string;
  voice: "neutral" | "teacher";
  video: boolean;
}
