export type AudioPlaybackState =
  | "idle"
  | "buffering"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error"
  | "interrupted";

export type WaveformPoint = {
  t: number; // performance.now()
  amp: number; // 0..1
};

