import { useTTS } from "../textToSpeech/useTTS";


export function TTSToggle() {
  const { enabled, toggle } = useTTS();

  return (
    <button
      onClick={toggle}
      style={{
        position: "fixed",
        bottom: 64,
        right: 16,
        padding: "8px 12px",
        borderRadius: 6,
      }}
    >
      {enabled ? "🔊 AI Text To Speech On" : "🔇 AI Text To Speech Off"}
    </button>
  );
}
