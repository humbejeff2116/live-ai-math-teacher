import { useTeachingSession } from "../session/useTeachingSession";

export function VoiceInputButton({ sessionId }: { sessionId: string }) {
  const { startListening, listening } = useTeachingSession(sessionId);

  return (
    <button
      onClick={startListening}
      disabled={listening}
      style={{
        padding: "12px 20px",
        fontSize: "16px",
        borderRadius: "8px",
      }}
    >
      {listening ? "Listening..." : "Answer by voice"}
    </button>
  );
}
