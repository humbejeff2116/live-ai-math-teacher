import { useEffect, useRef } from "react";
import { SpeechRecognizer } from "./speechRecognizer";
import { useDebugState } from "../state/debugState";
import { useWebSocketState } from "../state/weSocketState";

export function useSpeechInput(
  onTranscript: (text: string) => void,
  setIsListening: (val: boolean) => void
) {
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const { setState: setDebugState } = useDebugState();
  const { wsClientRef } = useWebSocketState();

  useEffect(() => {
    recognizerRef.current = new SpeechRecognizer(
      (text) => {
        setDebugState((s) => ({ ...s, lastTranscript: text }));
        onTranscript(text);
      },
      () => {
        // Student started speaking → interrupt AI
        wsClientRef?.current?.send({ type: "user_interrupt" });
        setIsListening(true);
      }
    );

    return () => {
      recognizerRef.current?.stop();
      recognizerRef.current = null;
    };
  }, [onTranscript, setDebugState, setIsListening, wsClientRef]);

  function startListening() {
    recognizerRef.current?.start();
  }

  function stopListening() {
    recognizerRef.current?.stop();
    setIsListening(false);
  }

  return {
    startListening,
    stopListening,
  };
}
