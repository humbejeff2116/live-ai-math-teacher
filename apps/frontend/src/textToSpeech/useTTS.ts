import { useCallback, useEffect, useRef, useState } from "react";
import { TTSEngine } from "./ttsEngine";

export function useTTS() {
  const engineRef = useRef<TTSEngine | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    engineRef.current = new TTSEngine();
    return () => {
      engineRef.current = null;
    };
  }, []);

  // Wrap in useCallback
  const speak = useCallback((text: string) => {
    engineRef.current?.speak(text);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((e) => {
      engineRef.current?.setEnabled(!e);
      return !e;
    });
  }, []);

  const interrupt = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  return { speak, enabled, toggle, interrupt };
}
