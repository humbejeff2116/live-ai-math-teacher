import { appName, type TeacherState } from "@shared/types";
// import { AstridAvatar } from "./AstridAvatar";
import { Sparkles } from "lucide-react";
import { AstridAvatar } from "./AstridAvatar";

type AstridLogoProps = {
  size?: "sm" | "md";
  teacherState?: TeacherState;
};

export function AstridLogo({ size = "md", teacherState }: AstridLogoProps) {
  const isSmall = size === "sm";
  const astridState =
    teacherState === "thinking"
      ? "thinking"
      : teacherState === "explaining" || teacherState === "re-explaining"
        ? "explaining"
        : "idle";

  return (
    <div className="flex items-center gap-3">
      {/* <AstridAvatar size={isSmall ? "sm" : "md"} state={astridState} /> */}
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
        <Sparkles size={18} />
      </div>
      <div className="leading-tight">
        <div className="text-base font-semibold text-slate-900">{appName}</div>
        <div className="text-xs text-slate-500">Powered by Astrid</div>
      </div>
    </div>
  );
}
