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
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          {topBar}
        </div>
      </div>

      {audioStrip && (
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-3">{audioStrip}</div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl flex-1 min-h-0 px-4 py-4 mb-10">
        {/*NOTE... On mobile it can be fine, but if you ever see odd height behavior, you
        can safely set it always: Replace: lg:grid-rows-[minmax(0,1fr)] with:
        grid-rows-[minmax(0,1fr)] */}
        <div
          className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4
          lg:grid-cols-[280px_minmax(480px,1fr)_260px]
          xl:grid-cols-[280px_minmax(520px,1fr)_260px]
          2xl:grid-cols-[300px_minmax(560px,1fr)_300px]"
        >
          <div className="min-h-0 min-w-0">{stepsRail}</div>
          <div className="min-h-0 min-w-0">{conversation}</div>
          <div className="min-h-0 min-w-0">{quickSettings}</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">{inputBar}</div>
      </div>
    </div>
  );
}
