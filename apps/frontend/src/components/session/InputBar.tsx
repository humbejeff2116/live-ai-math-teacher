import type { Dispatch, SetStateAction } from "react";

type InputBarProps = {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  onSend: () => void;
  isListening: boolean;
  onStartListening: () => void;
};

export function InputBar({
  input,
  setInput,
  onSend,
  isListening,
  onStartListening,
}: InputBarProps) {
  const canSend = input.trim().length > 0;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onStartListening}
        disabled={isListening}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Start voice input"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <rect x="9" y="4" width="6" height="10" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v2M8 20h8" />
        </svg>
      </button>

      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Type your answer..."
        rows={1}
        className="flex-1 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-300 focus:outline-none"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
      />

      <button
        type="button"
        onClick={() => {
          if (canSend) onSend();
        }}
        disabled={!canSend}
        className="h-11 rounded-md border border-slate-200 bg-red-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Send
      </button>
    </div>
  );
}
