/* eslint-disable @typescript-eslint/no-explicit-any */

type SpeechResultHandler = (text: string) => void;
type SpeechStartHandler = () => void;
type SpeechEndHandler = () => void;
type SpeechErrorHandler = (err: unknown) => void;

type VUMeterHandler = (level01: number) => void;

export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null;

  // mic level
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private raf: number | null = null;

  constructor(
    onResult: SpeechResultHandler,
    onStart?: SpeechStartHandler,
    onEnd?: SpeechEndHandler,
    onError?: SpeechErrorHandler,
    onLevel?: VUMeterHandler,
  ) {
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      console.warn("Speech recognition not supported");
      return;
    }

    this.recognition = new SpeechRecognitionImpl();

    if (this.recognition) {

    this.recognition.lang = "en-US";
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript.trim().length > 0) onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event);
      onError?.(event);
    };

    // IMPORTANT: fires when recognition stops (naturally or manually)
    this.recognition.onend = () => {
      onEnd?.();
    };
  }

    // Optional: basic VU meter (shows user is speaking)
    // Runs only when we start listening and stops on stop().
    this.onLevel = onLevel ?? null;
  }

  private onLevel: VUMeterHandler | null = null;

  async start() {
    // Start VU meter first (so UI shows “listening” immediately)
    if (this.onLevel) {
      await this.startMeter();
    }
    this.recognition?.start();
  }

  stop() {
    this.recognition?.stop();
    this.stopMeter();
  }

  private async startMeter() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      this.audioCtx = new AudioContext();
      const src = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      src.connect(this.analyser);

      const data = new Uint8Array(this.analyser.frequencyBinCount);

      const tick = () => {
        if (!this.analyser || !this.onLevel) return;
        this.analyser.getByteTimeDomainData(data);

        // quick energy estimate 0..1
        let sum = 0;
        for (const v of data) sum += Math.abs(v - 128);
        const level = Math.min(1, sum / data.length / 128);

        this.onLevel(level);
        this.raf = requestAnimationFrame(tick);
      };

      this.raf = requestAnimationFrame(tick);
    } catch (err) {
      // If mic permission denied, speech recognition may still work in some browsers;
      // don’t hard fail.
      console.warn("VU meter unavailable:", err);
    }
  }

  private stopMeter() {
    if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    try {
      this.mediaStream?.getTracks().forEach((t) => t.stop());
    } catch { /* empty */ }

    this.mediaStream = null;
    this.analyser = null;

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    // clear level
    this.onLevel?.(0);
  }
}
