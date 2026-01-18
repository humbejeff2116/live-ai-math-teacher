import type { WaveformPoint } from "./audioTypes";

export class LiveAudioPlayer {
  private audioCtx: AudioContext;
  private analyser: AnalyserNode;
  private gainNode: GainNode;
  private queue: AudioBuffer[] = [];
  private playing = false;
  private stopped = false;
  private totalEnqueuedDurationMs = 0; // Track total duration enqueued so far

  private waveform: WaveformPoint[] = [];

  private startTimeMs: number | null = null;
  private seekFadeToken = 0;
  private seekFadeTimeoutId: number | null = null;

  private onStart?: () => void;
  private onStop?: () => void;

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
        fadeStart + fadeInSeconds
      );
    }, fadeOutMs);
  }

  async enqueueChunk(
    base64: string
  ): Promise<{ startMs: number; endMs: number } | null> {
    if (this.stopped) return null;

    const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const buffer = await this.audioCtx.decodeAudioData(data.buffer);

    const durationMs = buffer.duration * 1000;
    const startMs = this.totalEnqueuedDurationMs;
    const endMs = startMs + durationMs;

    this.queue.push(buffer);
    this.totalEnqueuedDurationMs = endMs; // Increment the timeline marker

    if (!this.playing) {
      this.playNext();
    }
    return { startMs, endMs };
  }

  stop() {
    this.queue = [];
    this.playing = false;
    this.stopped = true;
    this.startTimeMs = null;
    this.totalEnqueuedDurationMs = 0; // Reset timeline marker
    this.onStop?.();
  }

  getWaveform(): WaveformPoint[] {
    return this.waveform;
  }

  private playNext() {
    const buffer = this.queue.shift();
    if (!buffer) {
      this.playing = false;
      this.onStop?.();
      return;
    }

    if (!this.playing) {
      this.playing = true;
      this.stopped = false;

      // anchor timeline ON FIRST PLAY
      if (this.startTimeMs == null) {
        this.startTimeMs = this.audioCtx.currentTime * 1000;
      }

      this.onStart?.();
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser);
    source.start();

    this.captureAmplitude();

    source.onended = () => {
      if (!this.stopped) {
        this.playNext();
      }
    };
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

