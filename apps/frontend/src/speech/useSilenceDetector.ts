import { useEffect, useRef } from "react";

export function useSilenceDetector(
  stream: MediaStream | null,
  onSilence: (silenceMs: number) => void,
  threshold = 0.01,
  silenceDurationMs = 1200
) {
  const silenceStart = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 2048;
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const value = (data[i] - 128) / 128;
        sum += value * value;
      }

      const rms = Math.sqrt(sum / data.length);

      if (rms < threshold) {
        if (!silenceStart.current) {
          silenceStart.current = performance.now();
        } else {
          const duration = performance.now() - silenceStart.current;
          if (duration > silenceDurationMs) {
            onSilence(duration);
            silenceStart.current = null;
          }
        }
      } else {
        silenceStart.current = null;
      }

      requestAnimationFrame(tick);
    };

    tick();

    return () => {
      audioCtx.close();
    };
  }, [stream, onSilence, threshold, silenceDurationMs]);
}
