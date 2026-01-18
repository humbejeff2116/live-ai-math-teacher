import type { StepAudioRange } from "@shared/types";

//TODO... later
// cache last index for monotonic playback (O(1) amortized)
// expose getRangeForStep(stepId)
// add seekToStep(stepId)


export class AudioStepTimeline {
  private ranges: StepAudioRange[] = [];
  private _isDestroyed = false;

  onStepStart(stepId: string, atMs: number) {
    if (this._isDestroyed) return;

    // Close previous open range if any
    const last = this.ranges[this.ranges.length - 1];
    if (last && last.endMs == null) {
      last.endMs = atMs;
    }

    this.ranges.push({
      stepId,
      startMs: atMs,
    });
  }

  onStepEnd(stepId: string, atMs: number) {
    if (this._isDestroyed) return;

    const range = this.ranges.find(
      (r) => r.stepId === stepId && r.endMs == null
    );
    if (range) {
      range.endMs = atMs;
    }
  }

  /**
   * Precise registration of audio duration per step.
   * If multiple chunks are received for the same step,
   * it expands the existing range.
   */
  registerStepRange(stepId: string, startMs: number, endMs: number) {
    if (this._isDestroyed) return;

    const existing = this.ranges.find((r) => r.stepId === stepId);

    if (existing) {
      // Expand the existing range to cover the new chunk
      existing.startMs = Math.min(existing.startMs, startMs);
      existing.endMs = Math.max(existing.endMs ?? 0, endMs);
    } else {
      // First chunk for this step
      this.ranges.push({
        stepId,
        startMs,
        endMs,
      });

      // Sort ranges by start time to ensure binary search works
      this.ranges.sort((a, b) => a.startMs - b.startMs);
    }
  }

  /**
   * O(log n) active step lookup
   */
  getActiveStep(atMs: number): string | undefined {
    if (this._isDestroyed || this.ranges.length === 0) return undefined;

    // Binary search for the range containing atMs
    let low = 0;
    let high = this.ranges.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const range = this.ranges[mid];
      const end = range.endMs ?? Infinity;

      if (atMs < range.startMs) {
        high = mid - 1;
      } else if (atMs >= end) {
        low = mid + 1;
      } else {
        return range.stepId;
      }
    }
    return undefined;
  }

  getTotalDurationMs(): number {
    if (this.ranges.length === 0) return 0;

    const lastRange = this.ranges[this.ranges.length - 1];
    return lastRange.endMs ?? lastRange.startMs;
  }

  getRanges(): StepAudioRange[] {
    return this.ranges;
  }

  getRangeForStep(stepId: string): StepAudioRange | undefined {
    return this.ranges.find((range) => range.stepId === stepId);
  }

  reset() {
    this.ranges = [];
  }

  /**
   * Cleans up resources and prevents further updates.
   * Called by the useLiveSession hook on unmount.
   */
  destroy() {
    this._isDestroyed = true;
    this.reset();
  }
}
