import { ConnectionStatus } from "./ConnectionStatus";

type TopBarProps = {
  teacherLabel: string;
  status: "connected" | "disconnected" | "reconnecting";
  onReconnect?: () => void;
  onStartNewProblem: () => void;
};

export function TopBar({
  teacherLabel,
  status,
  onReconnect,
  onStartNewProblem,
}: TopBarProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Live AI Math Teacher
          </h1>
          <div className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {teacherLabel}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onStartNewProblem}
          className="rounded-md border border-rose-200 bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600"
          type="button"
        >
          Clear &amp; New Problem
        </button>
        <ConnectionStatus status={status} onReconnect={onReconnect} />
      </div>
    </div>
  );
}
