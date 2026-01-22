import { appName, type TeacherState } from "@shared/types";
import { AstridAvatar } from "./AstridAvatar";

type AstridLogoProps = {
  size?: "sm" | "md";
  teacherState?: TeacherState;
};

export function AstridLogo({ size = "sm", teacherState }: AstridLogoProps) {
  const isSmall = size === "sm";
  const astridState =
    teacherState === "thinking"
      ? "thinking"
      : teacherState === "explaining" || teacherState === "re-explaining"
        ? "explaining"
        : "idle";

  return (
    <div className="flex items-center gap-2">
      <AstridAvatar size={isSmall ? "sm" : "md"} state={astridState} />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-slate-900">{appName}</div>
        <div className="text-xs text-slate-500">Powered by Astrid</div>
      </div>
    </div>
  );
}
