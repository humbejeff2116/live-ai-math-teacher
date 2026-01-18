import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { EquationStep, ReexplanStyle } from "@shared/types";
import { EquationSteps } from "../EquationSteps";

type StepsRailProps = {
  steps: (EquationStep & { uiIndex: number })[];
  activeStepId?: string;
  previewStepId?: string;
  hoverStepId: string | null;
  animatedStepId: string | null;
  pendingStepId?: string;
  onStepClick?: (id: string) => void;
  onReExplain: (id: string, style?: ReexplanStyle) => void;
};

const TOOLTIP_STORAGE_KEY = "stepsRailTooltipSeen";

export function StepsRail({
  steps,
  activeStepId,
  previewStepId,
  hoverStepId,
  animatedStepId,
  pendingStepId,
  onStepClick,
  onReExplain,
}: StepsRailProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const hasSteps = steps.length > 0;
  const pendingLabel = pendingStepId ? "Resume here?" : undefined;

  const tooltipSeen = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(TOOLTIP_STORAGE_KEY) === "true";
  }, []);

  const handleTooltipEvent = useEffectEvent((show: boolean) => {
    window.localStorage.setItem(TOOLTIP_STORAGE_KEY, "true");
    setShowTooltip(show);
  });

  useEffect(() => {
    if (!hasSteps || tooltipSeen) return;
    handleTooltipEvent(false);
    const timeout = window.setTimeout(() => setShowTooltip(false), 5500);
    return () => window.clearTimeout(timeout);
  }, [hasSteps, tooltipSeen]);

  return (
    <div className="relative h-full lg:sticky lg:top-24">
      <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b border-slate-200  px-4 py-3">
          <div className="text-sm font-semibold text-slate-700">
            Equation Steps
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

        <div
          className={`flex-1 overflow-y-auto px-3 py-3 ${
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
