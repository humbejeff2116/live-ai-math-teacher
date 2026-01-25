import { type AudioStatus, type TeacherState } from "@shared/types";
import { ConnectionStatus } from "./ConnectionStatus";
import { useEffect } from "react";
import { AstridLogo } from "../astrid/AstridLogo";
import { routes } from "@/routes";
import { Link } from "react-router-dom";

type TopBarProps = {
  teacherLabel: string;
  status: "connected" | "disconnected" | "reconnecting";
  teacherState: TeacherState;
  onReconnect?: () => void;
  onStartNewProblem: () => void;
  audioBuffering?: boolean;
  audioConnStatus?: AudioStatus;
  audioConnReason?: string;
};

function Waveform() {
  return (
    // Fixed width and height prevents the badge from "shaking"
    <div className="flex items-center gap-0.5 h-4 w-4 justify-center">
      <div className="w-0.5 h-3 bg-sky-500 rounded-full animate-wave delay-1" />
      <div className="w-0.5 h-3 bg-sky-500 rounded-full animate-wave delay-2" />
      <div className="w-0.5 h-3 bg-sky-500 rounded-full animate-wave delay-3" />
    </div>
  );
}

export function TopBar({
  teacherLabel,
  teacherState,
  status,
  onReconnect,
  onStartNewProblem,
  audioConnStatus,
  audioBuffering = false,
  audioConnReason,
}: TopBarProps) {
  const isActive =
  teacherState === "explaining" || teacherState === "re-explaining";

  useEffect(() => {
    const link = document.querySelector("link[rel='icon']");
    if (!link) return;

    const normalFavicon = "/astrid-favicon.svg";
    const thinkingFavicon = "/astrid-favicon-thinking.svg";
    link.setAttribute(
      "href",
      teacherState === "thinking" ? thinkingFavicon : normalFavicon,
    );

  }, [teacherState]);

  const audioPill =
    audioConnStatus === "ready"
      ? {
          text: "Audio Connected",
          cls: "border-emerald-200 bg-emerald-50 text-emerald-800",
          dot: "bg-emerald-500",
        }
      : audioConnStatus === "handshaking"
        ? {
            text: "Audio Handshaking…",
            cls: "border-slate-200 bg-slate-50 text-slate-700",
            dot: "bg-slate-400",
          }
        : audioConnStatus === "reconnecting"
          ? {
              text: "Audio Reconnecting…",
              cls: "border-amber-200 bg-amber-50 text-amber-800",
              dot: "bg-amber-500",
            }
          : audioConnStatus === "connecting"
            ? {
                text: "Audio Connecting…",
                cls: "border-slate-200 bg-slate-50 text-slate-700",
                dot: "bg-slate-400",
              }
            : audioConnStatus === "error"
              ? {
                  text: "Audio Error",
                  cls: "border-rose-200 bg-rose-50 text-rose-800",
                  dot: "bg-rose-500",
                }
              : audioConnStatus === "closed"
                ? {
                    text: "Audio Offline",
                    cls: "border-rose-200 bg-rose-50 text-rose-800",
                    dot: "bg-rose-500",
                  }
                : null;
  
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div>
          <Link to={routes.landing}>
            <AstridLogo />
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`mt-1 inline-flex items-center gap-2 rounded-full  px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 h-7 ${
            isActive
              ? "bg-sky-50 border-sky-200 text-sky-700"
              : "bg-indigo-50 ring-1 ring-indigo-100 text-slate-600"
          }`}
        >
          {isActive ? <Waveform /> : null}
          {teacherState === "thinking" && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          {teacherState === "idle" && (
            <span className="h-2 w-2 rounded-full bg-slate-400" />
          )}
          {teacherState === "explaining" && !isActive && (
            <span className="h-2 w-2 rounded-full bg-sky-500" />
          )}
          {teacherState === "re-explaining" && !isActive && (
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
          )}
          {teacherState === "waiting" && (
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
          )}
          <span className="leading-none">{teacherLabel}</span>
        </div>
        {audioPill && (
          <div
            title={audioConnReason ? `Reason: ${audioConnReason}` : undefined}
            className={`h-7 mt-1 inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${audioPill.cls}`}
          >
            <span className={`h-2 w-2 rounded-full ${audioPill.dot}`} />
            {audioPill.text}
          </div>
        )}
        {audioBuffering && (
          <div className="h-7 mt-1 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Audio Buffering...
          </div>
        )}
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
