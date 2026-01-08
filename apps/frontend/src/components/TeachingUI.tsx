import { useGeminiLiveStream } from "../gemini/useGeminiLiveStream";
import { useGeminiTransport } from "../transport/useGeminiTransport";
import { VoiceInputButton } from "./VoiceInputButton";




export function TeachingUI() {
  const { videoRef, handleChunk } = useGeminiLiveStream();
  const sessionId = '';

  useGeminiTransport(sessionId, handleChunk);

  return (
    <>
      <video ref={videoRef} autoPlay muted />
      <VoiceInputButton sessionId={sessionId} />
    </>
  );
}

