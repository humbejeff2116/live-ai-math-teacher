import type { ChatMessage } from "../../session/useLiveSession";

type ConversationPanelProps = {
  chat: ChatMessage[];
  streamingText: string;
};

export function ConversationPanel({
  chat,
  streamingText,
}: ConversationPanelProps) {
  const hasChat = chat.length > 0;
  const showEmpty = !hasChat && !streamingText;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-semibold text-slate-700">Conversation</div>
        <div className="text-xs text-slate-400">Live responses</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {streamingText && (
          <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            <span>{streamingText}</span>
            <span className="ml-1 inline-block animate-pulse">|</span>
          </div>
        )}

        {showEmpty && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Ask a question to start the lesson. The conversation will appear
            here.
          </div>
        )}

        {hasChat && (
          <div className="flex flex-col gap-3">
            {chat.map((message) => {
              const isStudent = message.role === "student";
              return (
                <div
                  key={message.id}
                  className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl border px-4 py-2 text-sm leading-relaxed shadow-sm ${
                      isStudent
                        ? "border-blue-200 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-800 text-left"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
