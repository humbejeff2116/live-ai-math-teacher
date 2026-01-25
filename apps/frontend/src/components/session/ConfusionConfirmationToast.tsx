import { useEffect, useRef, useState } from "react";

export function ConfusionConfirmToast(props: {
  stepIndex: number; // 0-based from server
  onHint: () => void;
  onExplain: () => void;
  onDismiss: () => void;
  autoHideMs?: number;
  pendingChoice?: "hint" | "explain" | null;
  reasonText?: string | null;
  reasonShownAtMs?: number | null;
}) {
  const {
    stepIndex,
    onHint,
    onExplain,
    onDismiss,
    autoHideMs = 5200,
    pendingChoice = null,
    reasonText = null,
    reasonShownAtMs = null,
  } = props;

  const [paused, setPaused] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const remainingMsRef = useRef(autoHideMs);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const isPending = pendingChoice != null;

  useEffect(() => {
    const t = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(t);
  }, [autoHideMs, onDismiss]);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (ms: number) => {
    clearTimer();
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onDismiss();
    }, ms);
  };

  // Start / restart timer when mounted or autoHideMs changes
  useEffect(() => {
    remainingMsRef.current = autoHideMs;
    startTimer(autoHideMs);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoHideMs]);

  // Pause/resume behavior
  useEffect(() => {
    if (!paused) {
      // resume
      startTimer(Math.max(400, remainingMsRef.current));
      return;
    }

    // pause
    if (startedAtRef.current != null) {
      const elapsed = Date.now() - startedAtRef.current;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    }
    clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Escape to dismiss
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  useEffect(() => {
    if (!reasonText) {
      setShowReason(false);
      return;
    }

    setShowReason(true);
    const t = window.setTimeout(() => setShowReason(false), 3000);
    return () => window.clearTimeout(t);
  }, [reasonText, reasonShownAtMs]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 88,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 70,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-slate-700">
          Stuck on step {stepIndex + 1}?
        </div>

        <div className="text-xs font-medium text-slate-700">
          {isPending ? (
            pendingChoice === "hint" ? (
              <>Got it — sending a small hint…</>
            ) : (
              <>Got it — I’ll re-explain that step…</>
            )
          ) : (
            <>Want a hint for step {stepIndex + 1}?</>
          )}
        </div>

        </div>

        {showReason && reasonText && (
          <div className="mt-1 text-xs italic text-slate-500">
            {reasonText}
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
          type="button"
          onClick={onHint}
          disabled={isPending}
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            isPending
              ? "bg-slate-100 text-slate-400"
              : "bg-slate-100 text-slate-800 hover:bg-slate-200",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-1.5">
            {pendingChoice === "hint" ? (
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent"
                aria-hidden
              />
            ) : null}
            Small hint
          </span>
        </button>

        <button
          type="button"
          onClick={onExplain}
          disabled={isPending}
          className={[
            "rounded-full px-3 py-1 text-xs font-semibold",
            isPending
              ? "bg-emerald-600/40 text-white/70"
              : "bg-emerald-600 text-white hover:bg-emerald-700",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-1.5">
            {pendingChoice === "explain" ? (
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border border-white/80 border-t-transparent"
                aria-hidden
              />
            ) : null}
            Re-explain
          </span>
        </button>
        
        <button
          type="button"
          onClick={onDismiss}
          disabled={isPending}
          className={[
            "rounded-full px-2 py-1 text-xs font-semibold",
            isPending ? "text-slate-300" : "text-slate-500 hover:bg-slate-100",
          ].join(" ")}
          aria-label="Dismiss"
          title={isPending ? "Working…" : "Dismiss"}
        >
          ✕
        </button>
        </div>
      </div>
    </div>
  );
}
