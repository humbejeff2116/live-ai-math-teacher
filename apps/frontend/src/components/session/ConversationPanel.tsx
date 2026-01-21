import { BotMessageSquare } from "lucide-react";
import type { ChatMessage } from "../../session/useLiveSession";
import { AstridAvatar } from "../astrid/AstridAvatar";
import type { TeacherState } from "@shared/types/src/teacherState";
import { useEffect, useState } from "react";
import { avatarName } from "@shared/types";

//NOTE...
//If you ever reuse ConversationPanel outside this grid, you can add:
//className="... min-w-[520px] ..."

type ConversationPanelProps = {
  chat: ChatMessage[];
  streamingText: string;
  teacherState: TeacherState;
  status?: "connected" | "disconnected" | "reconnecting";
};

export function ConversationPanel({
  chat,
  streamingText,
  teacherState,
  status,
}: ConversationPanelProps) {
  const hasChat = chat.length > 0;
  const showEmpty = !hasChat && !streamingText;
  const astridState =
    teacherState === "thinking"
      ? "thinking"
      : teacherState === "explaining" || teacherState === "re-explaining"
        ? "explaining"
        : "idle";
  // Keep the empty block mounted briefly so it can fade out
  const [shouldRenderEmpty, setShouldRenderEmpty] = useState(showEmpty);
  


  useEffect(() => {
    if (showEmpty) {
      Promise.resolve().then(() => setShouldRenderEmpty(true));
      return;
    }

    const t = window.setTimeout(() => setShouldRenderEmpty(false), 220);
    return () => window.clearTimeout(t);
  }, [showEmpty]);

  return (
    <div className="flex h-full min-h-0 min-w-[520px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <BotMessageSquare size={18} />
          <span>Conversation</span>
        </div>
        <div className="text-xs text-slate-400">Live responses</div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {shouldRenderEmpty && (
          <div
            className={[
              "absolute inset-0 flex flex-col items-center justify-center text-center px-6",
              "transition-opacity duration-200",
              showEmpty ? "opacity-100" : "opacity-0 pointer-events-none",
            ].join(" ")}
          >
            <AstridAvatar size="lg" state={astridState} status={status} />
            <h3 className="mt-3 text-lg font-semibold text-slate-800">
              Hi, I'm {avatarName}!
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Your AI math teacher. Ask me a question and I'll solve it step by
              step.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                Solve 12 + x = 16
              </button>
              <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                Explain balancing
              </button>
              <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                Give practice problem
              </button>
            </div>
          </div>
        )}

        {streamingText && (
          <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
            <span>{streamingText}</span>
            <span className="ml-1 inline-block animate-pulse">|</span>
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
