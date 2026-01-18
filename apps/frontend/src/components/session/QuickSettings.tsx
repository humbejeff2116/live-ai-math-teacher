import { useEffect, useState } from "react";

const STORAGE_KEY = "quickSettingsOpen";

export function QuickSettings() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? value === "true" : true;
  });
  const [teachingStyle, setTeachingStyle] = useState("guided");
  const [pace, setPace] = useState("steady");
  const [explainEveryStep, setExplainEveryStep] = useState(true);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(open));
  }, [open]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-700">
            Quick Settings
          </div>
          <div className="text-xs text-slate-400">Visual only</div>
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
        <div className="flex flex-1 flex-col gap-4 px-4 py-4">
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
        </div>
      )}
    </div>
  );
}
