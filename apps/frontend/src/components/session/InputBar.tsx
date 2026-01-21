import { Mic, Send } from "lucide-react";
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
        <Mic />
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
        className="cursor-pointer h-11 rounded-full border border-slate-200 bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <Send size={30} />
      </button>
    </div>
  );
}
