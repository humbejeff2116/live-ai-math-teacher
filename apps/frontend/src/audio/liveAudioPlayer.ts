import type { WaveformPoint } from "./audioTypes";

export class LiveAudioPlayer {
  private audioCtx: AudioContext;
  private analyser: AnalyserNode;
  private queue: AudioBuffer[] = [];
  private playing = false;
  private stopped = false;

  private waveform: WaveformPoint[] = [];

  private startTimeMs: number | null = null;

  private onStart?: () => void;
  private onStop?: () => void;

  constructor(onStart?: () => void, onStop?: () => void) {
    this.audioCtx = new AudioContext();

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioCtx.destination);

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

  async enqueueChunk(base64: string) {
    if (this.stopped) return;

    const data = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const buffer = await this.audioCtx.decodeAudioData(data.buffer);

    this.queue.push(buffer);

    if (!this.playing) {
      this.playNext();
    }
  }

  stop() {
    this.queue = [];
    this.playing = false;
    this.stopped = true;
    this.startTimeMs = null;
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

