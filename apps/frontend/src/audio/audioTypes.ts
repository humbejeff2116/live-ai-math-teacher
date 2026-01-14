export type AudioPlaybackState = "idle" | "playing" | "interrupted";

export type WaveformPoint = {
  t: number; // performance.now()
  amp: number; // 0..1
};

