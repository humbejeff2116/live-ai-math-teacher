import type { WaveformPoint } from "./audioTypes";

export class LiveAudioPlayer {
  private audioCtx: AudioContext;
  private analyser: AnalyserNode;
  private gainNode: GainNode;

  /**
   * Jitter buffer queue (AudioBuffers not yet scheduled).
   * We only start playback once pendingBufferedSec >= minStartBufferSec.
   */
  private queue: AudioBuffer[] = [];
  private pendingBufferedSec = 0;

  private playing = false;
  private stopped = false;

  private totalEnqueuedDurationMs = 0;
  private waveform: WaveformPoint[] = [];

  private startTimeMs: number | null = null;
  private seekFadeToken = 0;
  private seekFadeTimeoutId: number | null = null;

  private onStart?: () => void;
  private onStop?: () => void;

  private unlocked = false;

  // Stable scheduler cursor in AudioContext time (seconds)
  private nextPlayTimeSec: number | null = null;

  // ==== Scheduling & buffering tuning ====
  // Keep cursor ~ this far ahead of "now". Increase if you still underrun.
  private readonly targetLatencySec = 0.25;
  // Never schedule earlier than now + lookahead (+ device latencies)
  private readonly lookaheadSec = 0.05;
  // Don’t start output until we have at least this much audio buffered.
  private readonly minStartBufferSec = 0.15;
  // If cursor falls behind "now" by more than this, resync forward.
  private readonly driftResetBehindSec = 0.25;
  // If cursor gets too far ahead (bursty network), pull it back.
  private readonly driftResetAheadSec = 1.0;

  constructor(onStart?: () => void, onStop?: () => void) {
    this.audioCtx = new AudioContext();

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;

    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1;

    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this.onStart = onStart;
    this.onStop = onStop;
  }

  async unlock(): Promise<boolean> {
    try {
      if (this.stopped) return false;

      if (this.audioCtx.state !== "running") {
        await this.audioCtx.resume();
      }

      // Tiny silent tick to satisfy some browsers
      const silent = this.audioCtx.createBuffer(1, 1, this.audioCtx.sampleRate);
      const src = this.audioCtx.createBufferSource();
      src.buffer = silent;
      src.connect(this.gainNode);
      const t = this.audioCtx.currentTime;
      src.start(t);
      src.stop(t + 0.01);

      this.unlocked = true;

      // If we already queued audio, attempt to schedule (will respect minStartBuffer)
      this.kick();
      return true;
    } catch (err) {
      console.warn("LiveAudioPlayer.unlock() failed:", err);
      return false;
    }
  }

  private async ensureRunning(): Promise<boolean> {
    if (this.stopped) return false;
    if (!this.unlocked) return false;

    try {
      if (this.audioCtx.state !== "running") {
        await this.audioCtx.resume();
      }
      return this.audioCtx.state === "running";
    } catch (err) {
      console.warn("AudioContext resume failed:", err);
      return false;
    }
  }

  getCurrentTimeMs(): number {
    if (this.startTimeMs == null) return 0;
    return this.audioCtx.currentTime * 1000 - this.startTimeMs;
  }

  seekToMs(targetMs: number) {
    const safeTargetMs = Math.max(0, targetMs);
    this.startTimeMs = this.audioCtx.currentTime * 1000 - safeTargetMs;
  }

  seekWithFadeMs(targetMs: number, fadeOutMs = 100, fadeInMs = 150) {
    if (this.stopped) return;

    const safeTargetMs = Math.max(0, targetMs);
    const currentGain = this.gainNode.gain.value;
    if (currentGain <= 0) {
      this.seekToMs(safeTargetMs);
      return;
    }

    this.seekFadeToken += 1;
    const token = this.seekFadeToken;

    if (this.seekFadeTimeoutId != null) {
      window.clearTimeout(this.seekFadeTimeoutId);
      this.seekFadeTimeoutId = null;
    }

    const now = this.audioCtx.currentTime;
    const fadeOutSeconds = Math.max(0, fadeOutMs) / 1000;
    const fadeInSeconds = Math.max(0, fadeInMs) / 1000;

    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(currentGain, now);

    if (fadeOutSeconds === 0) {
      this.seekToMs(safeTargetMs);
      this.gainNode.gain.setValueAtTime(currentGain, now);
      return;
    }

    this.gainNode.gain.linearRampToValueAtTime(0, now + fadeOutSeconds);
    this.seekFadeTimeoutId = window.setTimeout(() => {
      if (this.seekFadeToken !== token) return;
      this.seekToMs(safeTargetMs);

      const fadeStart = this.audioCtx.currentTime;
      this.gainNode.gain.cancelScheduledValues(fadeStart);
      this.gainNode.gain.setValueAtTime(0, fadeStart);
      this.gainNode.gain.linearRampToValueAtTime(
        currentGain,
        fadeStart + fadeInSeconds,
      );
    }, fadeOutMs);
  }

  async enqueueChunk(
    base64: string,
    mimeType?: string,
  ): Promise<{ startMs: number; endMs: number } | null> {
    if (this.stopped) return null;

    let bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // PCM must be even length (int16)
    if (bytes.length % 2 === 1) {
      bytes = bytes.slice(0, bytes.length - 1);
    }

    const isPcm =
      mimeType?.startsWith("audio/pcm") ||
      mimeType?.includes("L16") ||
      mimeType?.includes("linear16");

    let buffer: AudioBuffer;

    if (isPcm) {
      const rateMatch = mimeType?.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;

      const sampleCount = Math.floor(bytes.length / 2);
      if (sampleCount <= 0) return null;

      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );

      const float32 = new Float32Array(sampleCount);

      // Convert int16 -> float32
      let maxAbs = 0;
      for (let i = 0; i < sampleCount; i++) {
        const s16 = view.getInt16(i * 2, true);
        const f = Math.max(-1, Math.min(1, s16 / 32768));
        float32[i] = f;
        const a = Math.abs(f);
        if (a > maxAbs) maxAbs = a;
      }
      // If you still want the log, keep it. Otherwise remove for perf.
      // console.log("pcm max abs", maxAbs);

      buffer = this.audioCtx.createBuffer(1, float32.length, sampleRate);
      buffer.copyToChannel(float32, 0);

      // Remove boundary clicks
      this.applyEdgeFade(buffer, 0.004);
    } else {
      try {
        buffer = await this.audioCtx.decodeAudioData(bytes.buffer.slice(0));
        this.applyEdgeFade(buffer, 0.004);
      } catch (e) {
        console.warn("decodeAudioData failed. mimeType=", mimeType, e);
        return null;
      }
    }

    const durationMs = buffer.duration * 1000;
    const startMs = this.totalEnqueuedDurationMs;
    const endMs = startMs + durationMs;

    // Jitter buffer: enqueue without scheduling immediately
    this.queue.push(buffer);
    this.pendingBufferedSec += buffer.duration;

    this.totalEnqueuedDurationMs = endMs;

    const ok = await this.ensureRunning();
    if (ok) this.schedule();

    return { startMs, endMs };
  }

  private schedule() {
    if (this.stopped) return;
    if (this.queue.length === 0) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Device latencies (best-effort)
    const baseLatency = Number.isFinite(ctx.baseLatency) ? ctx.baseLatency : 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawOutputLatency = (ctx as any).outputLatency;
    const outputLatency = Number.isFinite(rawOutputLatency)
      ? rawOutputLatency
      : 0;
    const latencySec = baseLatency + outputLatency;

    // Don??Tt start output until we have a minimum buffer (real jitter buffer)
    if (!this.playing && this.pendingBufferedSec < this.minStartBufferSec) {
      return;
    }

    // Initialize cursor on first start
    if (this.nextPlayTimeSec == null) {
      this.nextPlayTimeSec = now + this.targetLatencySec + latencySec;
    }

    const cursor = this.nextPlayTimeSec;
    if (cursor == null) return;

    // Drift handling
    const behindBy = now - cursor;
    if (behindBy > this.driftResetBehindSec) {
      this.nextPlayTimeSec = now + this.targetLatencySec + latencySec;
    }

    const aheadBy = (this.nextPlayTimeSec ?? now) - now;
    if (!this.playing && aheadBy > this.driftResetAheadSec) {
      this.nextPlayTimeSec = now + this.targetLatencySec + latencySec;
    }

    // Clamp: never schedule in the past; enforce lookahead margin
    const earliestSafe = now + this.lookaheadSec + latencySec;

    // Start bookkeeping once we truly begin output
    if (!this.playing) {
      this.playing = true;

      // Anchor timeline on first-ever play
      if (this.startTimeMs == null) {
        this.startTimeMs = now * 1000;
      }

      this.onStart?.();
    }

    // Schedule as many buffers as we have queued.
    // (If you want, you can cap scheduling to e.g. 1??"2s ahead, but not required.)
    while (this.queue.length > 0) {
      const buffer = this.queue.shift()!;
      this.pendingBufferedSec = Math.max(
        0,
        this.pendingBufferedSec - buffer.duration,
      );

      if (this.nextPlayTimeSec == null) {
        this.nextPlayTimeSec = earliestSafe;
      }
      const startAt = Math.max(this.nextPlayTimeSec ?? earliestSafe, earliestSafe);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.analyser);
      source.start(startAt);

      // UI-only, best effort (don??Tt block audio)
      this.captureAmplitude();

      const endAt = startAt + buffer.duration;
      this.nextPlayTimeSec = endAt;

      source.onended = () => {
        const cursor = this.nextPlayTimeSec ?? 0;
        // Stop only after we??Tve truly finished scheduled audio and nothing pending
        if (
          !this.stopped &&
          this.queue.length === 0 &&
          this.pendingBufferedSec <= 0.001 &&
          ctx.currentTime + 0.05 >= cursor
        ) {
          this.playing = false;
          this.nextPlayTimeSec = null;
          this.onStop?.();
        }
      };
    }
  }

  // Kick after unlock to flush queued audio (respects minStartBufferSec)
  kick(): void {
    if (this.stopped) return;
    if (this.audioCtx.state !== "running") return;
    if (this.queue.length === 0) return;

    this.schedule();
  }

  stop() {
    this.queue = [];
    this.pendingBufferedSec = 0;

    this.playing = false;
    this.stopped = true;

    this.startTimeMs = null;
    this.totalEnqueuedDurationMs = 0;
    this.nextPlayTimeSec = null;

    this.onStop?.();
  }

  getWaveform(): WaveformPoint[] {
    return this.waveform;
  }

  private applyEdgeFade(buffer: AudioBuffer, fadeSeconds: number) {
    const ch = 0;
    const data = buffer.getChannelData(ch);
    const fadeSamples = Math.max(
      1,
      Math.floor(buffer.sampleRate * fadeSeconds),
    );
    const n = data.length;

    // fade in
    for (let i = 0; i < Math.min(fadeSamples, n); i++) {
      data[i] *= i / fadeSamples;
    }
    // fade out
    for (let i = 0; i < Math.min(fadeSamples, n); i++) {
      const idx = n - 1 - i;
      const k = i / Math.max(1, fadeSamples - 1);
      data[idx] *= 1 - k;
    }
  }

  private captureAmplitude() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (const v of data) sum += Math.abs(v - 128);

    const amp = Math.min(1, sum / data.length / 128);

    this.waveform.push({
      t: this.getCurrentTimeMs(),
      amp,
    });

    if (this.waveform.length > 500) {
      this.waveform.shift();
    }
  }
}
