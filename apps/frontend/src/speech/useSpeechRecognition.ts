/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<any>(null);
  const [transcript, setTranscript] = useState("");

  function start() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      throw new Error("Speech recognition not supported");
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        setTranscript((prev) => prev + " " + finalText);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  function stop(): string {
    recognitionRef.current?.stop();
    return transcript.trim();
  }

  function reset() {
    setTranscript("");
  }

  return { start, stop, reset };
}
