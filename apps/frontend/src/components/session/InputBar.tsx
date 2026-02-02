import { Mic, MicOff, Send } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

type InputBarProps = {
  input: string;
  micLevel: number; // 0..1
  setInput: Dispatch<SetStateAction<string>>;
  onSend: () => void;
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  isUserSpeaking: boolean;
  showSilencePulse?: boolean;
};

export function InputBar({
  input,
  isListening,
  isUserSpeaking,
  micLevel,
  setInput,
  onSend,
  onStartListening,
  onStopListening,
  showSilencePulse = false,
}: InputBarProps) {
  const canSend = input.trim().length > 0;

  const micLabel = isListening ? "Stop voice input" : "Start voice input";
  const micHandler = isListening ? onStopListening : onStartListening;

  // Clamp micLevel defensively (should already be 0..1)
  const level = Math.max(0, Math.min(1, micLevel ?? 0));

  return (
    <div className="flex items-center gap-2">
      {/* Mic button (toggle) */}
      <button
        type="button"
        onClick={micHandler}
        className={[
          "cursor-pointer relative flex h-11 w-11 items-center justify-center rounded-md border shadow-sm transition",
          isListening
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
        ].join(" ")}
        aria-label={micLabel}
        title={micLabel}
      >
        {/* Silence nudge pulse ring (only when not listening) */}
        {showSilencePulse && !isListening && (
          <>
            {/* soft outer ping */}
            <span
              className="pointer-events-none absolute inset-0 rounded-md animate-ping"
              style={{
                boxShadow: "0 0 0 2px rgba(16,185,129,0.35)", // emerald-ish
              }}
              aria-hidden
            />
            {/* steady faint ring to anchor the ping */}
            <span
              className="pointer-events-none absolute inset-0 rounded-md"
              style={{
                boxShadow: "0 0 0 2px rgba(16,185,129,0.18)",
              }}
              aria-hidden
            />
          </>
        )}
        {isListening ? <MicOff /> : <Mic />}

        {/* Speaking indicator ring */}
        {isListening && (
          <span
            className={[
              "pointer-events-none absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2 ring-white",
              isUserSpeaking ? "animate-pulse bg-emerald-500" : "bg-slate-400",
            ].join(" ")}
            style={{ opacity: Math.min(1, 0.35 + level * 0.9) }}
          />
        )}
      </button>

      {/* Text input */}
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={isListening ? "Listening..." : "Type your answer..."}
        rows={1}
        className={[
          "flex-1 resize-none rounded-md border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none",
          isListening
            ? "border-emerald-200 focus:border-emerald-300"
            : "border-slate-200 focus:border-slate-300",
        ].join(" ")}
        onKeyDown={(event) => {
          // Esc stops listening
          if (event.key === "Escape" && isListening) {
            event.preventDefault();
            onStopListening();
            return;
          }

          // Enter sends (unless Shift+Enter)
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
      />

      {/* Mic level mini-meter + label */}
      {isListening && (
        <div className="hidden sm:flex flex-col justify-center gap-1 pr-1">
          <div className="text-[11px] font-medium text-slate-600">
            {isUserSpeaking ? "Speaking…" : "Listening…"}
            <span className="ml-1 text-slate-400">(Esc to stop)</span>
          </div>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-75"
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Send */}
      <button
        type="button"
        onClick={() => {
          if (canSend) onSend();
        }}
        disabled={!canSend}
        className="h-11 cursor-pointer rounded-full border border-slate-200 bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        aria-label="Send message"
        title="Send"
      >
        <Send size={30} />
      </button>
    </div>
  );
}
