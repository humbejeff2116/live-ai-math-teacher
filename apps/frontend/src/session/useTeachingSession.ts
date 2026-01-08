import { useEffect, useState } from "react";
import { getMicrophoneStream } from "../audio/microphone";
import { useSilenceDetector } from "../audio/useSilenceDetector";
import { useSpeechRecognition } from "../audio/useSpeechRecognition";
import { sendInteraction } from "../api/interaction";
import { useTeachingState } from "../state/teachingState";


export function useTeachingSession(sessionId: string) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [listening, setListening] = useState(false);

  const speech = useSpeechRecognition();
  const { setState: setTeachingState } = useTeachingState();

  useEffect(() => {
    getMicrophoneStream().then(setStream);
  }, []);

  useSilenceDetector(stream, async (silenceMs) => {
    if (!listening) return;

    setListening(false);
    const transcript = speech.stop();

    const response = await sendInteraction({
      sessionId,
      transcript,
      silenceMs,
    });
    
    setTeachingState(response); // This powers the overlay
    speech.reset();
  });

  function startListening() {
    speech.reset();
    speech.start();
    setListening(true);
  }

  return {
    startListening,
    listening,
  };
}
