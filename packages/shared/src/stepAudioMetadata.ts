export type StepAudioTiming = {
  stepId: string;
  audioStartMs: number;
  audioEndMs?: number;
};

export type AudioMarkerEvent =
  | {
      type: "step_audio_start";
      stepId: string;
      atMs: number;
    }
  | {
      type: "step_audio_end";
      stepId: string;
      atMs: number;
    };
