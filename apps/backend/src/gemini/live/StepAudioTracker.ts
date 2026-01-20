import { StepAudioTiming } from "@shared/types";
import { AudioClock } from "./AudioClock.js";
// import { StepAudioTiming } from "../types/StepAudioMetadata";

export class StepAudioTracker {
  private timings = new Map<string, StepAudioTiming>();
  private activeStepId: string | null = null;

  constructor(private clock: AudioClock) {}

  startStep(stepId: string) {
    if (this.activeStepId) {
      this.endStep(this.activeStepId);
    }

    this.activeStepId = stepId;
    this.timings.set(stepId, {
      stepId,
      audioStartMs: this.clock.nowMs(),
    });
  }

  endStep(stepId: string) {
    const timing = this.timings.get(stepId);
    if (!timing || timing.audioEndMs) return;

    timing.audioEndMs = this.clock.nowMs();
    this.activeStepId = null;
  }

  interrupt() {
    if (this.activeStepId) {
      this.endStep(this.activeStepId);
    }
  }

  getTimings() {
    return Array.from(this.timings.values());
  }
}
