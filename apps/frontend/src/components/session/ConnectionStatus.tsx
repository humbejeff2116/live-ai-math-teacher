import { useEffect, useRef, useState } from "react";

type ConnectionStatusProps = {
  status: "connected" | "disconnected" | "reconnecting";
  onReconnect?: () => void;
};

const STATUS_COPY = {
  connected: "Connected",
  disconnected: "Disconnected",
  reconnecting: "Reconnecting",
};

const STATUS_COLOR = {
  connected: "bg-emerald-500",
  disconnected: "bg-rose-500",
  reconnecting: "bg-amber-500",
};

export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <rect x="5" y="4" width="14" height="12" rx="2" />
            <path d="M9 16v2m6-2v2M8 9h1m6 0h1" />
          </svg>
          <span
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white ${STATUS_COLOR[status]}`}
          />
        </span>
        <span className="hidden text-sm font-medium text-slate-700 sm:inline">
          {STATUS_COPY[status]}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[status]}`}
            />
            <span className="font-medium text-slate-800">
              {STATUS_COPY[status]}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Connection status updates as the session syncs with the teacher.
          </p>
          {onReconnect ? (
            <button
              type="button"
              onClick={onReconnect}
              className="mt-3 w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reconnect
            </button>
          ) : (
            <div title="Reconnect not available">
              <button
                type="button"
                disabled
                className="mt-3 w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 disabled:cursor-not-allowed"
              >
                Reconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
