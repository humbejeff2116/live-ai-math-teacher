/* eslint-disable @typescript-eslint/no-unused-vars */
import type { StepAudioRange } from "@shared/types";

type StepAudioRangeEx = StepAudioRange & {
  // Optional sample-accurate fields (preferred)
  startSample?: number;
  endSample?: number;
};

export class AudioStepTimeline {
  private ranges: StepAudioRangeEx[] = [];
  private _isDestroyed = false;

  // Monotonic playback optimization
  private lastActiveIndex = 0;

  // If you use sample-accurate registration, keep this around
  private globalSampleCursor = 0;

  // If you want consistent conversion:
  // Gemini PCM is usually 24000Hz
  private sampleRate = 24000;

  constructor(opts?: { sampleRate?: number }) {
    if (opts?.sampleRate) this.sampleRate = opts.sampleRate;
  }

  /**
   * Event-based step boundaries (coarse). Keeps for compatibility.
   * Prefer registerChunkSamples/registerStepRange for precise sync.
   */
  onStepStart(stepId: string, atMs: number) {
    if (this._isDestroyed) return;

    // Close previous open range if any
    const last = this.ranges[this.ranges.length - 1];
    if (last && last.endMs == null) {
      last.endMs = atMs;
    }

    this.ranges.push({ stepId, startMs: atMs });
    this.ensureSortedIfNeeded();
  }

  onStepEnd(stepId: string, atMs: number) {
    if (this._isDestroyed) return;

    const range = this.ranges.find(
      (r) => r.stepId === stepId && r.endMs == null,
    );
    if (range) range.endMs = atMs;
  }

  /**
   * Precise registration of audio duration per step (ms-based).
   * If multiple chunks are received for the same step, expands existing range.
   */
  registerStepRange(stepId: string, startMs: number, endMs: number) {
    if (this._isDestroyed) return;

    const existing = this.ranges.find((r) => r.stepId === stepId);

    if (existing) {
      existing.startMs = Math.min(existing.startMs, startMs);
      existing.endMs = Math.max(existing.endMs ?? startMs, endMs);
    } else {
      this.insertSortedByStartMs({
        stepId,
        startMs,
        endMs,
      });
    }

    // Keep monotonic cache valid (ranges may have moved)
    this.lastActiveIndex = Math.min(
      this.lastActiveIndex,
      this.ranges.length - 1,
    );
  }

  /**
   * Best path: sample-accurate registration, driven by your audio scheduling.
   * Call this when you enqueue/schedule audio for a step.
   *
   * Example:
   *   const samples = pcmBytes.length / 2;
   *   timeline.registerChunkSamples(stepId, samples);
   */
  registerChunkSamples(stepId: string, chunkSamples: number) {
    if (this._isDestroyed) return;
    if (chunkSamples <= 0) return;

    const startSample = this.globalSampleCursor;
    const endSample = startSample + chunkSamples;
    this.globalSampleCursor = endSample;

    const startMs = (startSample / this.sampleRate) * 1000;
    const endMs = (endSample / this.sampleRate) * 1000;

    // Merge/expand per step id (step may receive multiple chunks)
    const existing = this.ranges.find((r) => r.stepId === stepId);

    if (existing) {
      existing.startSample = Math.min(
        existing.startSample ?? startSample,
        startSample,
      );
      existing.endSample = Math.max(existing.endSample ?? endSample, endSample);

      existing.startMs = Math.min(existing.startMs, startMs);
      existing.endMs = Math.max(existing.endMs ?? startMs, endMs);
    } else {
      this.insertSortedByStartMs({
        stepId,
        startMs,
        endMs,
        startSample,
        endSample,
      });
    }

    this.lastActiveIndex = Math.min(
      this.lastActiveIndex,
      this.ranges.length - 1,
    );
  }

  /**
   * Fast path for monotonic playback: O(1) amortized.
   * Use this in your RAF loop with the player's current time (ms).
   */
  getActiveStepMonotonic(atMs: number): string | undefined {
    if (this._isDestroyed || this.ranges.length === 0) return undefined;

    // Clamp index
    let i = Math.max(0, Math.min(this.lastActiveIndex, this.ranges.length - 1));

    // Walk forward while we've passed the end
    while (i < this.ranges.length) {
      const r = this.ranges[i];
      const end = r.endMs ?? Infinity;
      if (atMs < r.startMs) {
        // We’re before current range; if time moved backwards, fall back to binary search
        break;
      }
      if (atMs >= end) {
        i++;
        continue;
      }
      // inside range
      this.lastActiveIndex = i;
      return r.stepId;
    }

    // If time jumps backward or index got out of sync, do a binary search fallback
    const step = this.getActiveStep(atMs);
    if (step) {
      // Rehydrate lastActiveIndex to the found range
      const idx = this.findIndexByStepId(step);
      if (idx != null) this.lastActiveIndex = idx;
    }
    return step;
  }

  /**
   * O(log n) active step lookup (binary search)
   */
  getActiveStep(atMs: number): string | undefined {
    if (this._isDestroyed || this.ranges.length === 0) return undefined;

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
    // Return without sample fields
    return this.ranges.map(({ startSample, endSample, ...r }) => r);
  }

  getRangeForStep(stepId: string): StepAudioRange | undefined {
    const r = this.ranges.find((range) => range.stepId === stepId);
    if (!r) return undefined;
    const { startSample, endSample, ...base } = r;
    return base;
  }

  /**
   * Useful for “click step -> seek”.
   * Returns the range + suggested seek time (startMs).
   */
  seekToStep(stepId: string): { seekMs: number; range: StepAudioRange } | null {
    const r = this.ranges.find((x) => x.stepId === stepId);
    if (!r) return null;
    const { startSample, endSample, ...base } = r;
    return { seekMs: base.startMs, range: base };
  }

  reset() {
    this.ranges = [];
    this.lastActiveIndex = 0;
    this.globalSampleCursor = 0;
  }

  destroy() {
    this._isDestroyed = true;
    this.reset();
  }

  // ========= internals =========

  private insertSortedByStartMs(range: StepAudioRangeEx) {
    // Binary insert by startMs (keeps ranges sorted without full sort)
    let low = 0;
    let high = this.ranges.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.ranges[mid].startMs <= range.startMs) low = mid + 1;
      else high = mid;
    }

    this.ranges.splice(low, 0, range);
  }

  private ensureSortedIfNeeded() {
    // Safety for mixed usage patterns (onStepStart pushes, registerStepRange inserts).
    // If you exclusively use insertSortedByStartMs/register APIs, you can remove this.
    if (this.ranges.length < 2) return;
    const n = this.ranges.length;
    if (this.ranges[n - 2].startMs > this.ranges[n - 1].startMs) {
      this.ranges.sort((a, b) => a.startMs - b.startMs);
    }
  }

  private findIndexByStepId(stepId: string): number | null {
    for (let i = 0; i < this.ranges.length; i++) {
      if (this.ranges[i].stepId === stepId) return i;
    }
    return null;
  }
}
