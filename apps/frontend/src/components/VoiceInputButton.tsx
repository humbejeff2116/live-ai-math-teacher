
export function VoiceInputButton({
  listening,
  handleStartListening,
}: {
  listening: boolean;
  handleStartListening: () => void;
}) {
  return (
    <button
      onClick={handleStartListening}
      disabled={listening}
      style={{
        padding: "12px 20px",
        fontSize: "16px",
        borderRadius: "8px",
      }}
    >
      {listening ? "Listening..." : "🎤 Answer By Voice"}
    </button>
  );
}
