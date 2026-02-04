import { useEffect, useMemo, useState } from "react";
import type { ReexplanStyle, TeacherState } from "@shared/types";
import { EquationSteps } from "../EquationSteps";
import { Infinity as InfinityLucide } from "lucide-react";
import type { UIEquationStep } from "../../session/useLiveSession";
import type { AudioPlaybackState } from "../../audio/audioTypes";

type StepsRailProps = {
  steps: UIEquationStep[];
  activeStepId?: string;
  previewStepId?: string | null;
  hoverStepId: string | null;
  animatedStepId: string | null;
  pendingStepId?: string;
  teacherState?: TeacherState;
  audioState?: AudioPlaybackState;
  confusionPendingStepId?: string;
  confusionConfirmedStepIndex?: number;
  onStepClick?: (id: string, rect: DOMRect) => void;
  onReExplain: (id: string, style?: ReexplanStyle) => void;
  reExplainStepId?: string | null;
};

const TOOLTIP_STORAGE_KEY = "stepsRailTooltipSeen";

export function StepsRail({
  steps,
  activeStepId,
  previewStepId,
  hoverStepId,
  animatedStepId,
  pendingStepId,
  teacherState,
  audioState,
  confusionPendingStepId,
  confusionConfirmedStepIndex,
  onStepClick,
  onReExplain,
  reExplainStepId = null,
}: StepsRailProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const hasSteps = steps.length > 0;
  const pendingLabel = pendingStepId ? "Resume here?" : undefined;
  const reExplainStep = useMemo(
    () => steps.find((step) => step.id === reExplainStepId) ?? null,
    [steps, reExplainStepId],
  );

  const tooltipSeen = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(TOOLTIP_STORAGE_KEY) === "true";
  }, []);

  useEffect(() => {
    if (!hasSteps || tooltipSeen) return;
    window.sessionStorage.setItem(TOOLTIP_STORAGE_KEY, "true");
    Promise.resolve().then(() => setShowTooltip(true));
    const timeout = window.setTimeout(() => setShowTooltip(false), 10500);
    return () => {
      window.clearTimeout(timeout);
    }
  }, [hasSteps, tooltipSeen]);

  return (
    <div className="relative h-full lg:sticky lg:top-24">
      <div className="relative flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <InfinityLucide size={20} />
            <span>Equation Steps</span>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 lg:hidden"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? "Show" : "Hide"}
          </button>
        </div>

        {showTooltip && (
          <div className="relative mx-3 mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 shadow-sm">
            You can click any step to explore or resume from it.
          </div>
        )}
        {teacherState === "re-explaining" && reExplainStep && (
          <div className="mx-3 mt-2 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            Re-explain linked to Step {reExplainStep.uiIndex}
          </div>
        )}

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 ${
            collapsed ? "hidden lg:block" : "block"
          }`}
        >
          {hasSteps ? (
            <EquationSteps
              steps={steps}
              activeStepId={activeStepId}
              previewStepId={previewStepId}
              hoverStepId={hoverStepId}
              animatedStepId={animatedStepId}
              pendingStepId={pendingStepId}
              pendingStepLabel={pendingLabel}
              teacherState={teacherState}
              audioState={audioState}
              confusionPendingStepId={confusionPendingStepId}
              confusionConfirmedStepIndex={confusionConfirmedStepIndex}
              onReExplain={onReExplain}
              onStepClick={onStepClick}
              showHeader={false}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Steps will appear here as the teacher explains the solution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
