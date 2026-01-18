import type { ReactNode } from "react";

type SessionShellProps = {
  topBar: ReactNode;
  stepsRail: ReactNode;
  conversation: ReactNode;
  quickSettings: ReactNode;
  inputBar: ReactNode;
  audioStrip?: ReactNode;
};

export function SessionShell({
  topBar,
  stepsRail,
  conversation,
  quickSettings,
  inputBar,
  audioStrip,
}: SessionShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          {topBar}
        </div>
      </div>

      {audioStrip && (
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-3">
            {audioStrip}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 pb-28 lg:min-h-0 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_260px] lg:grid-rows-[minmax(0,1fr)] lg:gap-4">
        <div className="min-h-0">{stepsRail}</div>
        <div className="min-h-0">{conversation}</div>
        <div className="min-h-0">{quickSettings}</div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          {inputBar}
        </div>
      </div>
    </div>
  );
}
