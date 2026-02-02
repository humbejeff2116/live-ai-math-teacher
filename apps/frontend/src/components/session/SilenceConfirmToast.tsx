// import type { SilenceHelpChoice } from "@shared/types";
import { useEffect, useMemo, useRef, useState } from "react";

type PendingChoice = "repeat" | "hint" | "stuck" | null;

export function SilenceConfirmToast(props: {
  stepIndex: number;
  onDismiss: () => void;
  onRepeatQuestion: () => void;
  onGiveHint: () => void;
  onImStuck?: () => void; // optional bridge into confusion loop
  autoHideMs?: number | null; // default: sticky
  // pendingChoice: SilenceHelpChoice | null;
}) {
  const {
    stepIndex,
    onDismiss,
    onRepeatQuestion,
    onGiveHint,
    onImStuck,
    autoHideMs = null, // sticky by default
    // pendingChoice = null,
  } = props;

  const isSticky = autoHideMs == null;

  const [paused, setPaused] = useState(false);
  const [pending, setPending] = useState<PendingChoice>(null);

  const remainingMsRef = useRef<number>(autoHideMs ?? 5200);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const showImStuck = typeof onImStuck === "function";
  const isPending = pending != null;

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (ms: number) => {
    if (isSticky) return;
    clearTimer();
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onDismiss();
    }, ms);
  };

  // Optional auto-hide (non-sticky mode)
  useEffect(() => {
    clearTimer();
    if (isSticky) return;
    remainingMsRef.current = autoHideMs ?? 5200;
    startTimer(remainingMsRef.current);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoHideMs, isSticky]);

  // Pause/resume on hover/focus (if auto-hide is enabled)
  useEffect(() => {
    if (isSticky) return;
    if (!paused) {
      startTimer(Math.max(400, remainingMsRef.current));
      return;
    }
    if (startedAtRef.current != null) {
      const elapsed = Date.now() - startedAtRef.current;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    }
    clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, isSticky]);

  // Escape to dismiss (disabled while pending)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isPending) return;
      onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss, isPending]);

  // Safety: if we went pending and nothing happens (network hiccup), unlock.
  // (TeacherSession will also clear on teacher response, but this prevents "stuck toast".)
  useEffect(() => {
    if (!isPending) return;
    const t = window.setTimeout(() => setPending(null), 2500);
    return () => window.clearTimeout(t);
  }, [isPending]);

  const subtitle = useMemo(() => {
    if (isPending) {
      if (pending === "repeat") return "Okay — repeating the question…";
      if (pending === "hint") return "Okay — sending a tiny hint…";
      return "Okay — I’ll help you get unstuck…";
    }
    return `I’m waiting for your reply on step ${stepIndex + 1}.`;
  }, [isPending, pending, stepIndex]);

  const Spinner = (props: { light?: boolean }) => (
    <span
      className={[
        "inline-block h-3 w-3 animate-spin rounded-full border border-t-transparent",
        props.light ? "border-white/80" : "border-slate-400",
      ].join(" ")}
      aria-hidden
    />
  );

  const onRepeat = () => {
    if (isPending) return;
    setPending("repeat");
    onRepeatQuestion();
  };

  const onHint = () => {
    if (isPending) return;
    setPending("hint");
    onGiveHint();
  };

  const onStuck = () => {
    if (isPending) return;
    if (!onImStuck) return;
    setPending("stuck");
    onImStuck();
  };

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
      <div className="rounded-sm border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-slate-700">Still there?</div>
          <div className="text-xs font-medium text-slate-700">{subtitle}</div>
        </div>

        {!isPending && (
          <div className="mt-1 text-xs italic text-slate-500">
            If you’re stuck, I can give a tiny hint or re-explain.
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onRepeat}
            disabled={isPending}
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              isPending
                ? "bg-slate-100 text-slate-400"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1.5">
              {pending === "repeat" ? <Spinner /> : null}
              Repeat question
            </span>
          </button>

          <button
            type="button"
            onClick={onHint}
            disabled={isPending}
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              isPending
                ? "bg-emerald-600/40 text-white/70"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-1.5">
              {pending === "hint" ? <Spinner light /> : null}
              Tiny hint
            </span>
          </button>

          {showImStuck && (
            <button
              type="button"
              onClick={onStuck}
              disabled={isPending}
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                isPending
                  ? "bg-amber-500/40 text-white/70"
                  : "bg-amber-500 text-white hover:bg-amber-600",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-1.5">
                {pending === "stuck" ? <Spinner light /> : null}
                I’m stuck
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onDismiss}
            disabled={isPending}
            className={[
              "rounded-full px-2 py-1 text-xs font-semibold",
              isPending
                ? "text-slate-300"
                : "text-slate-500 hover:bg-slate-100",
            ].join(" ")}
          >
            I’m here
          </button>

          <button
            type="button"
            onClick={onDismiss}
            disabled={isPending}
            className={[
              "rounded-full px-2 py-1 text-xs font-semibold",
              isPending
                ? "text-slate-300"
                : "text-slate-500 hover:bg-slate-100",
            ].join(" ")}
            aria-label="Dismiss"
            title={isPending ? "Working..." : "Dismiss"}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
