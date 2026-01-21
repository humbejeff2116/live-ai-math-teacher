import { useMemo } from "react";

type AstridState = "idle" | "thinking" | "explaining";
type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

type AstridAvatarProps = {
  state?: AstridState;
  status?: ConnectionStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE: Record<NonNullable<AstridAvatarProps["size"]>, number> = {
  sm: 44,
  md: 92,
  lg: 140,
};

export function AstridAvatar({
  state = "idle",
  status = "connected",
  size = "lg",
  className,
}: AstridAvatarProps) {
  const px = SIZE[size];

  const motionClass =
    state === "thinking"
      ? "animate-pulse"
      : state === "explaining"
        ? "animate-[float_5s_ease-in-out_infinite]"
        : "";

  // Status glow intensity
  const statusOpacity = useMemo(() => {
    if (status === "connected") return 0.28;
    if (status === "reconnecting") return 0.34;
    return 0.18; // disconnected
  }, [status]);

  return (
    <div className={`relative ${motionClass} ${className ?? ""}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Astrid"
        role="img"
      >
        {/* halo ring */}
        <circle
          cx="70"
          cy="70"
          r="60"
          stroke="url(#astridHalo)"
          strokeWidth="2"
          opacity="0.35"
        />

        {/* glow (reacts to connection status) */}
        <circle
          cx="70"
          cy="70"
          r="52"
          fill="url(#astridGlow)"
          opacity={statusOpacity}
          className={status === "reconnecting" ? "animate-pulse" : ""}
        />

        {/* head */}
        <circle cx="70" cy="72" r="40" fill="url(#astridBody)" />

        {/* eyes */}
        <g className="astrid-blink">
          <circle cx="56" cy="68" r="6" fill="var(--astrid-eye, #0f172a)" />
          <circle cx="84" cy="68" r="6" fill="var(--astrid-eye, #0f172a)" />
          <circle cx="58" cy="66" r="2" fill="white" />
          <circle cx="86" cy="66" r="2" fill="white" />
        </g>

        {/* antenna */}
        <line
          x1="70"
          y1="22"
          x2="70"
          y2="34"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="70" cy="20" r="3" fill="#6366f1" />

        <defs>
          {/* body: light/dark friendly gradient */}
          <linearGradient id="astridBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>

          {/* glow */}
          <radialGradient id="astridGlow">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* halo */}
          <linearGradient id="astridHalo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
