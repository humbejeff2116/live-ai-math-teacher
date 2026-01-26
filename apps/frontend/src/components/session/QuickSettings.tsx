import { useEffect, useMemo, useState } from "react";
import { DebugToggle } from "../DebugToggle";
import { Settings } from "lucide-react";
import type { StudentMemoryDoc } from "../../personalization/schema";
import {
  loadExplicitPreferences,
  loadStudentMemory,
  resetPersonalization,
  saveExplicitPreferences,
} from "../../personalization/storage";

const STORAGE_KEY = "quickSettingsOpen";

type NudgeStyleSnapshot = {
  label: string;
  confidence: number;
  dismissRate?: number;
};

const deriveNudgeStyle = (
  memory: StudentMemoryDoc | null,
): NudgeStyleSnapshot => {
  const events = memory?.evidenceEvents ?? [];
  let shown = 0;
  let dismissed = 0;
  for (const event of events) {
    if (event.type === "nudge_shown") shown += 1;
    if (event.type === "nudge_dismissed") dismissed += 1;
  }
  if (shown === 0) {
    return { label: "standard", confidence: 0.2 };
  }
  const dismissRate = dismissed / shown;
  if (shown >= 3 && dismissRate >= 0.75) {
    return { label: "gentle", confidence: 0.7, dismissRate };
  }
  if (shown >= 3 && dismissRate <= 0.25) {
    return { label: "active", confidence: 0.7, dismissRate };
  }
  return { label: "standard", confidence: 0.5, dismissRate };
};

export function QuickSettings() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? value === "true" : true;
  });
  const [teachingStyle, setTeachingStyle] = useState("guided");
  const [pace, setPace] = useState("steady");
  const [explainEveryStep, setExplainEveryStep] = useState(true);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [memorySnapshot, setMemorySnapshot] = useState<StudentMemoryDoc | null>(
    null,
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(open));
  }, [open]);

  const refreshPersonalization = () => {
    if (typeof window === "undefined") return;
    const memory = loadStudentMemory();
    const prefs = loadExplicitPreferences();
    setMemorySnapshot(memory);
    setPersonalizationEnabled(!prefs.disabledPersonalization);
  };

  useEffect(() => {
    if (!open) return;
    refreshPersonalization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const inferredPreferences = useMemo(() => {
    const estimates = memorySnapshot?.preferenceEstimates;
    const nudgeStyle = deriveNudgeStyle(memorySnapshot);
    return [
      {
        label: "Pace",
        value: estimates?.pace?.value ?? "n/a",
        confidence: estimates?.pace?.confidence,
      },
      {
        label: "Verbosity",
        value: estimates?.verbosity?.value ?? "n/a",
        confidence: estimates?.verbosity?.confidence,
      },
      {
        label: "Modality",
        value: estimates?.modality?.value ?? "n/a",
        confidence: estimates?.modality?.confidence,
      },
      {
        label: "Nudge style",
        value: nudgeStyle.label,
        confidence: nudgeStyle.confidence,
        detail:
          nudgeStyle.dismissRate != null
            ? `dismiss ${Math.round(nudgeStyle.dismissRate * 100)}%`
            : undefined,
      },
    ];
  }, [memorySnapshot]);

  const topConcepts = useMemo(() => {
    const stats = memorySnapshot?.conceptStats ?? {};
    const entries = Object.values(stats)
      .filter((stat) => typeof stat.difficultyScore === "number")
      .sort((a, b) => (b.difficultyScore ?? 0) - (a.difficultyScore ?? 0))
      .slice(0, 3);
    return entries;
  }, [memorySnapshot]);

  const handlePersonalizationToggle = (enabled: boolean) => {
    if (typeof window === "undefined") return;
    const prefs = loadExplicitPreferences();
    const next = { ...prefs, disabledPersonalization: !enabled };
    saveExplicitPreferences(next);
    setPersonalizationEnabled(enabled);
  };

  const handleResetPersonalization = () => {
    if (typeof window === "undefined") return;
    resetPersonalization();
    refreshPersonalization();
  };

  const formatConfidence = (value?: number) => {
    if (value == null) return "n/a";
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings size={18} />
            <span>Quick Settings</span>
          </div>
          <div className="text-xs text-slate-400">Visual only + personalization controls</div>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {open && (
        <>
          {/* min-h-0 keeps this flex child scrollable instead of forcing the card taller */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text">
          <label className="text-xs font-semibold text-slate-600">
            Teaching style
            <select
              value={teachingStyle}
              onChange={(event) => setTeachingStyle(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
            >
              <option value="guided">Guided walkthrough</option>
              <option value="socratic">Socratic questions</option>
              <option value="visual">Visual focus</option>
              <option value="concise">Concise recap</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Pace
            <select
              value={pace}
              onChange={(event) => setPace(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
            >
              <option value="slow">Slow and careful</option>
              <option value="steady">Steady</option>
              <option value="fast">Fast review</option>
            </select>
          </label>

          <label className="flex items-center justify-between text-xs font-semibold text-slate-600">
            Explain every step
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={explainEveryStep}
                onChange={(event) => setExplainEveryStep(event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500" />
              <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
            </span>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Additional notes
            <textarea
              placeholder="E.g., focus on word problems, use more examples, etc."
              className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
              rows={3}
            />
          </label>

          <div className="shadow-sm rounded-lg border  px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">
                Personalization (dev)
              </div>
              <button
                type="button"
                onClick={handleResetPersonalization}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Reset memory
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Personalization enabled</span>
              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={personalizationEnabled}
                  onChange={(event) =>
                    handlePersonalizationToggle(event.target.checked)
                  }
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-emerald-500" />
                <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
              </span>
            </div>

            <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              What I've learned
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {inferredPreferences.map((pref) => (
                <div key={pref.label} className="flex items-center justify-between">
                  <span>{pref.label}</span>
                  <span className="text-slate-500">
                    {pref.value} • {formatConfidence(pref.confidence)}
                    {pref.detail ? ` (${pref.detail})` : ""}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Top concept difficulty
            </div>
            {topConcepts.length === 0 ? (
              <div className="mt-1 text-xs text-slate-500">No concept data yet.</div>
            ) : (
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {topConcepts.map((stat) => (
                  <div key={stat.conceptId} className="flex items-center justify-between">
                    <span>{stat.conceptId}</span>
                    <span className="text-slate-500">
                      {(stat.difficultyScore ?? 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DebugToggle />
          </div>
        </>
      )}
    </div>
  );
}
