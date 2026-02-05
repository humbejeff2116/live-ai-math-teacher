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

    const existing = this.ranges.find((r) => r.stepId === stepId);
    if (
      existing &&
      (existing.startSample != null || existing.endSample != null)
    ) {
      return;
    }

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
    if (range && range.endSample == null) {
      range.endMs = atMs;
    }
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
    console.log("[AudioStepTimeline] registerChunkSamples called", {
      stepId,
      chunkSamples,
    });
    if (this._isDestroyed) {
       console.error(
         "[AudioStepTimeline] FATAL: registerChunkSamples called after destroy",
         new Error().stack,
       );
      return
    };
    if (chunkSamples <= 0) return;

    const startSample = this.globalSampleCursor;
    const endSample = startSample + chunkSamples;
    this.globalSampleCursor = endSample;

    const startMs = (startSample / this.sampleRate) * 1000;
    const endMs = (endSample / this.sampleRate) * 1000;

    // Merge/expand per step id (step may receive multiple chunks)
    const existing = this.ranges.find((r) => r.stepId === stepId);

    if (existing) {
      console.log("[AudioStepTimeline] registerChunkSamples expanding existing", {
        stepId,
        startSample,
        endSample,
        existing: { ...existing },
      });
      existing.startSample = Math.min(
        existing.startSample ?? startSample,
        startSample,
      );
      existing.endSample = Math.max(existing.endSample ?? endSample, endSample);

      existing.startMs = Math.min(existing.startMs, startMs);
      existing.endMs = Math.max(existing.endMs ?? startMs, endMs);
    } else {
      console.log("[AudioStepTimeline] registerChunkSamples inserting new", {
        stepId,
        startSample,
        endSample,
      });
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

  private cursorMs(): number {
    return (this.globalSampleCursor / this.sampleRate) * 1000;
  }

  getCursorMs(): number {
    return this.cursorMs();
  }

  getTotalDurationMs(): number {
    return this.cursorMs();
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

  /**
   * O(log n) lookup that never returns undefined if ranges exist.
   * If atMs is in a gap, it returns the closest step.
   */
  getNearestStep(atMs: number): string | undefined {
    if (this._isDestroyed || this.ranges.length === 0) return undefined;

    // 1. Try exact match first
    const exact = this.getActiveStep(atMs);
    console.log("[AudioStepTimeline] getNearestStep: exact match check", {
      atMs,
      exact,
    });
    if (exact) return exact;

    console.log("[AudioStepTimeline] getNearestStep: no exact match, searching gaps", {
      atMs,
      ranges: this.ranges,
    });

    // 2. Boundary checks
    if (atMs <= this.ranges[0].startMs) return this.ranges[0].stepId;
    const last = this.ranges[this.ranges.length - 1];
    if (atMs >= (last.endMs ?? Infinity)) return last.stepId;

    // 3. Find the gap neighbors (Binary Search approach)
    let low = 0;
    let high = this.ranges.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const range = this.ranges[mid];

      if (atMs < range.startMs) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // At this point, 'high' is the index before the gap, 'low' is the index after.
    const prev = this.ranges[high];
    const next = this.ranges[low];

    if (!prev) return next?.stepId;
    if (!next) return prev?.stepId;

    // Return the step whose boundary is closer to the mouse
    const distToPrev = Math.abs((prev.endMs ?? prev.startMs) - atMs);
    const distToNext = Math.abs(next.startMs - atMs);

    return distToPrev < distToNext ? prev.stepId : next.stepId;
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
    console.log("[AudioStepTimeline] insertSortedByStartMs called", { range });
    // Binary insert by startMs (keeps ranges sorted without full sort)
    let low = 0;
    let high = this.ranges.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.ranges[mid].startMs <= range.startMs) low = mid + 1;
      else high = mid;
    }

    this.ranges.splice(low, 0, range);
    console.log("[AudioStepTimeline] insertSortedByStartMs at index", {
      index: low,
      range,
    });
    console.log("[AudioStepTimeline] current ranges:", this.ranges);
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
