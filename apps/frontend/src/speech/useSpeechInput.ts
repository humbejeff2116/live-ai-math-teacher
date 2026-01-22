import { useEffect, useMemo, useRef, useState } from "react";
import { SpeechRecognizer } from "./speechRecognizer";
import { useDebugState } from "../state/debugState";
import { useWebSocketState } from "../state/weSocketState";

export function useSpeechInput(
  onTranscript: (text: string) => void,
  setIsListening: (val: boolean) => void,
) {
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const { setState: setDebugState } = useDebugState();
  const { wsClientRef } = useWebSocketState();

  const [micLevel, setMicLevel] = useState(0);

  // “speaking” threshold; tune later
  const isUserSpeaking = useMemo(() => micLevel > 0.12, [micLevel]);

  useEffect(() => {
    const stop = () => {
      recognizerRef.current?.stop();
      setIsListening(false);
      setMicLevel(0);
    };

    recognizerRef.current = new SpeechRecognizer(
      (text) => {
        // result → auto stop
        setDebugState((s) => ({ ...s, lastTranscript: text }));
        onTranscript(text);
        stop();
      },
      () => {
        // recognition started: interrupt AI + set listening
        wsClientRef?.current?.send({ type: "user_interrupt" });
        setIsListening(true);
      },
      () => {
        // onend fires even if no result; ensure UI unlocks
        stop();
      },
      (err) => {
        setDebugState((s) => ({ ...s, lastSpeechError: String(err) }));
        stop();
      },
      (level01) => {
        setMicLevel(level01);
      },
    );

    return () => {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
    };
  }, [onTranscript, setDebugState, setIsListening, wsClientRef]);

  async function startListening() {
    await recognizerRef.current?.start();
  }

  function stopListening() {
    recognizerRef.current?.stop();
    setIsListening(false);
    setMicLevel(0);
  }

  return {
    startListening,
    stopListening,
    micLevel,
    isUserSpeaking,
  };
}
