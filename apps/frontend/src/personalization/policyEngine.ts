import type {
  ExplicitPreferences,
  PreferenceEstimate,
  ReasonCode,
  StudentMemoryDoc,
  TeachingStylePreference,
  ModalityPreference,
  PacePreference,
  VerbosityPreference,
} from "./schema";

export type DecisionSource = "default" | "explicit" | "inferred" | "session";

export type PersonalizationSettings = {
  pace: PacePreference;
  verbosity: VerbosityPreference;
  modality: ModalityPreference;
  teachingStyle: TeachingStylePreference;
  explainEveryStep: boolean;
};

export type NudgePolicy = {
  minSecondsBetweenNudges: number;
  confirmRequired: boolean;
  suppressForStepMs: number;
};

export type DecisionExplanation = {
  summary: string;
  reasonCodes: ReasonCode[];
  sources: DecisionSource[];
  details?: string[];
};

export type PersonalizationDecision = {
  settings: PersonalizationSettings;
  nudgePolicy: NudgePolicy;
  explanation: DecisionExplanation;
};

export type SessionContext = {
  stepId?: string;
  stepType?: string;
  conceptIds?: string[];
};

export type SessionSignals = {
  recentDismissalsForStep?: number;
  recentConfirmsForStep?: number;
};

export type DecidePersonalizationArgs = {
  studentMemoryDoc?: StudentMemoryDoc;
  explicitPreferences?: ExplicitPreferences;
  sessionContext?: SessionContext;
  sessionSignals?: SessionSignals;
  nowMs?: number;
};

const MIN_CONFIDENCE = 0.6;
const PREF_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REEXPLAIN_RECENT_MS = 7 * 24 * 60 * 60 * 1000;
const CONCEPT_DIFFICULTY_THRESHOLD = 0.7;
const CONCEPT_MIN_ATTEMPTS = 3;
const DEFAULT_SETTINGS: PersonalizationSettings = {
  pace: "steady",
  verbosity: "balanced",
  modality: "mixed",
  teachingStyle: "guided",
  explainEveryStep: true,
};
const DEFAULT_NUDGE_POLICY: NudgePolicy = {
  minSecondsBetweenNudges: 25, // matches the 25_000ms Week-2 cooldown
  confirmRequired: true,
  suppressForStepMs: 10_000,
};

const isEstimateUsable = <T,>(
  estimate: PreferenceEstimate<T> | undefined,
  nowMs: number,
): estimate is PreferenceEstimate<T> => {
  if (!estimate) return false;
  if (estimate.confidence < MIN_CONFIDENCE) return false;
  if (!estimate.updatedAtMs) return false;
  return nowMs - estimate.updatedAtMs <= PREF_TTL_MS;
};

const countRecentReexplains = (
  memory: StudentMemoryDoc | undefined,
  nowMs: number,
): number => {
  if (!memory?.evidenceEvents) return 0;
  return memory.evidenceEvents.filter((event) => {
    if (
      event.type !== "reexplain_started" &&
      event.type !== "reexplain_completed"
    ) {
      return false;
    }
    return nowMs - event.atMs <= REEXPLAIN_RECENT_MS;
  }).length;
};

const getHighDifficultyConcept = (
  memory: StudentMemoryDoc | undefined,
  conceptIds: string[] | undefined,
): { conceptId: string; difficultyScore: number } | null => {
  if (!memory?.conceptStats || !conceptIds || conceptIds.length === 0) {
    return null;
  }
  let best: { conceptId: string; difficultyScore: number } | null = null;
  for (const conceptId of conceptIds) {
    const stat = memory.conceptStats[conceptId];
    if (!stat) continue;
    if ((stat.totalAttempts ?? 0) < CONCEPT_MIN_ATTEMPTS) continue;
    const score = stat.difficultyScore ?? 0;
    if (score < CONCEPT_DIFFICULTY_THRESHOLD) continue;
    if (!best || score > best.difficultyScore) {
      best = { conceptId, difficultyScore: score };
    }
  }
  return best;
};

const getNudgeDismissalStats = (memory: StudentMemoryDoc | undefined) => {
  if (!memory?.evidenceEvents) {
    return { shown: 0, dismissed: 0, dismissRate: 0 };
  }
  let shown = 0;
  let dismissed = 0;
  for (const event of memory.evidenceEvents) {
    if (event.type === "nudge_shown") shown += 1;
    if (event.type === "nudge_dismissed") dismissed += 1;
  }
  const dismissRate = shown > 0 ? dismissed / shown : 0;
  return { shown, dismissed, dismissRate };
};

const describeChange = (
  field: keyof PersonalizationSettings,
  value: PersonalizationSettings[keyof PersonalizationSettings],
): string => {
  switch (field) {
    case "pace":
      return value === "slow"
        ? "Going slower"
        : value === "fast"
          ? "Moving faster"
          : "Keeping a steady pace";
    case "verbosity":
      return value === "concise"
        ? "Keeping explanations concise"
        : value === "detailed"
          ? "Adding more detail"
          : "Keeping explanations balanced";
    case "modality":
      return value === "visual"
        ? "Leaning on visual language"
        : value === "verbal"
          ? "Leaning on verbal explanation"
          : "Mixing visual and verbal explanation";
    case "teachingStyle":
      return value === "socratic"
        ? "Asking more questions"
        : value === "visual"
          ? "Highlighting visual intuition"
          : value === "concise"
            ? "Keeping recaps concise"
            : "Guiding step by step";
    case "explainEveryStep":
      return value ? "Explaining every step" : "Skipping some step narration";
    default:
      return "Using defaults";
  }
};

const uniqueList = <T,>(items: Iterable<T>): T[] => Array.from(new Set(items));

const buildSummary = (args: {
  disabled: boolean;
  changes: Array<{
    field: keyof PersonalizationSettings;
    source: DecisionSource;
    value: PersonalizationSettings[keyof PersonalizationSettings];
  }>;
  sources: Set<DecisionSource>;
  hasRecentReexplains: boolean;
  paceSource: DecisionSource;
  paceValue: PacePreference;
  conceptBiasApplied: boolean;
  conceptBiasAppliedPace: boolean;
  conceptBiasAppliedVerbosity: boolean;
}): string => {
  if (args.disabled) return "Personalization is off.";
  const { changes, sources } = args;

  if (args.conceptBiasApplied) {
    if (args.conceptBiasAppliedPace && args.conceptBiasAppliedVerbosity) {
      return "Going slower and adding more detail because this concept has been difficult recently.";
    }
    if (args.conceptBiasAppliedPace) {
      return "Going slower because this concept has been difficult recently.";
    }
    if (args.conceptBiasAppliedVerbosity) {
      return "Adding more detail because this concept has been difficult recently.";
    }
    return "Adjusting pace because this concept has been difficult recently.";
  }

  if (
    args.paceValue === "slow" &&
    args.paceSource === "inferred" &&
    args.hasRecentReexplains
  ) {
    return "Going slower because re-explanations were requested recently.";
  }

  if (changes.length > 0) {
    const phrases = changes
      .slice(0, 2)
      .map((change) => describeChange(change.field, change.value))
      .map((phrase) => phrase.replace(/^./, (c) => c.toUpperCase()));
    const base = phrases.length === 2 ? `${phrases[0]} and ${phrases[1]}` : phrases[0];

    if (sources.has("explicit") && sources.has("inferred")) {
      return `${base} based on your preferences and recent signals.`;
    }
    if (sources.has("explicit")) {
      return `${base} because you set those preferences.`;
    }
    if (sources.has("inferred")) {
      return `${base} based on recent signals.`;
    }
    if (sources.has("session")) {
      return `${base} based on recent session signals.`;
    }
    return `${base} using defaults.`;
  }

  if (sources.has("explicit")) return "Using your saved preferences.";
  if (sources.has("inferred")) return "Using inferred preferences based on recent signals.";
  if (sources.has("session")) return "Using recent session signals for nudges.";
  return "Using default teaching settings.";
};

export function decidePersonalization(
  args: DecidePersonalizationArgs,
): PersonalizationDecision {
  const nowMs = args.nowMs ?? Date.now();
  const memory = args.studentMemoryDoc;
  const explicit = args.explicitPreferences;
  const sessionSignals = args.sessionSignals;

  const personalizationDisabled =
    explicit?.disabledPersonalization === true ||
    (explicit as Partial<{ personalizationEnabled: boolean }>)?.personalizationEnabled ===
      false;

  const sources = new Set<DecisionSource>();
  const reasonCodes = new Set<ReasonCode>();
  const details: string[] = [];

  if (personalizationDisabled) {
    sources.add("explicit");
    return {
      settings: { ...DEFAULT_SETTINGS },
      nudgePolicy: { ...DEFAULT_NUDGE_POLICY },
      explanation: {
        summary: "Personalization is off.",
        reasonCodes: [],
        sources: ["explicit"],
      },
    };
  }

  const settings: PersonalizationSettings = { ...DEFAULT_SETTINGS };
  const fieldSources: Record<keyof PersonalizationSettings, DecisionSource> = {
    pace: "default",
    verbosity: "default",
    modality: "default",
    teachingStyle: "default",
    explainEveryStep: "default",
  };

  if (explicit?.pace) {
    settings.pace = explicit.pace;
    fieldSources.pace = "explicit";
    sources.add("explicit");
    details.push("Pace set from explicit preferences.");
  }
  if (explicit?.verbosity) {
    settings.verbosity = explicit.verbosity;
    fieldSources.verbosity = "explicit";
    sources.add("explicit");
    details.push("Verbosity set from explicit preferences.");
  }
  if (explicit?.modality) {
    settings.modality = explicit.modality;
    fieldSources.modality = "explicit";
    sources.add("explicit");
    details.push("Modality set from explicit preferences.");
  }
  if (explicit?.teachingStyle) {
    settings.teachingStyle = explicit.teachingStyle;
    fieldSources.teachingStyle = "explicit";
    sources.add("explicit");
    details.push("Teaching style set from explicit preferences.");
  }
  if (explicit?.explainEveryStep != null) {
    settings.explainEveryStep = explicit.explainEveryStep;
    fieldSources.explainEveryStep = "explicit";
    sources.add("explicit");
    details.push("Explain-every-step set from explicit preferences.");
  }

  const estimates = memory?.preferenceEstimates;
  if (fieldSources.pace === "default" && isEstimateUsable(estimates?.pace, nowMs)) {
    settings.pace = estimates!.pace!.value;
    fieldSources.pace = "inferred";
    sources.add("inferred");
    if (estimates?.pace?.reason) reasonCodes.add(estimates.pace.reason);
    details.push("Pace inferred from recent behavior.");
  }
  if (
    fieldSources.verbosity === "default" &&
    isEstimateUsable(estimates?.verbosity, nowMs)
  ) {
    settings.verbosity = estimates!.verbosity!.value;
    fieldSources.verbosity = "inferred";
    sources.add("inferred");
    if (estimates?.verbosity?.reason) reasonCodes.add(estimates.verbosity.reason);
    details.push("Verbosity inferred from recent behavior.");
  }
  if (
    fieldSources.modality === "default" &&
    isEstimateUsable(estimates?.modality, nowMs)
  ) {
    settings.modality = estimates!.modality!.value;
    fieldSources.modality = "inferred";
    sources.add("inferred");
    if (estimates?.modality?.reason) reasonCodes.add(estimates.modality.reason);
    details.push("Modality inferred from recent behavior.");
  }
  if (
    fieldSources.teachingStyle === "default" &&
    isEstimateUsable(estimates?.teachingStyle, nowMs)
  ) {
    settings.teachingStyle = estimates!.teachingStyle!.value;
    fieldSources.teachingStyle = "inferred";
    sources.add("inferred");
    if (estimates?.teachingStyle?.reason)
      reasonCodes.add(estimates.teachingStyle.reason);
    details.push("Teaching style inferred from recent behavior.");
  }
  if (
    fieldSources.explainEveryStep === "default" &&
    isEstimateUsable(estimates?.explainEveryStep, nowMs)
  ) {
    settings.explainEveryStep = estimates!.explainEveryStep!.value;
    fieldSources.explainEveryStep = "inferred";
    sources.add("inferred");
    if (estimates?.explainEveryStep?.reason)
      reasonCodes.add(estimates.explainEveryStep.reason);
    details.push("Explain-every-step inferred from recent behavior.");
  }

  const conceptBias = getHighDifficultyConcept(
    memory,
    args.sessionContext?.conceptIds,
  );
  let conceptBiasAppliedPace = false;
  let conceptBiasAppliedVerbosity = false;

  if (conceptBias) {
    if (fieldSources.pace !== "explicit" && settings.pace !== "slow") {
      settings.pace = "slow";
      fieldSources.pace = "inferred";
      conceptBiasAppliedPace = true;
    }
    if (fieldSources.verbosity !== "explicit" && settings.verbosity !== "detailed") {
      settings.verbosity = "detailed";
      fieldSources.verbosity = "inferred";
      conceptBiasAppliedVerbosity = true;
    }
    if (conceptBiasAppliedPace || conceptBiasAppliedVerbosity) {
      sources.add("inferred");
      reasonCodes.add("CONCEPT_DIFFICULTY_HIGH");
      const adjustments = [
        conceptBiasAppliedPace ? "slowing down" : null,
        conceptBiasAppliedVerbosity ? "adding detail" : null,
      ].filter(Boolean);
      details.push(
        `Concept difficulty is high (${conceptBias.difficultyScore.toFixed(2)}), ${adjustments.join(" and ")}.`,
      );
    }
  }

  const nudgePolicy: NudgePolicy = { ...DEFAULT_NUDGE_POLICY };
  const nudgeStats = getNudgeDismissalStats(memory);
  const sessionDismissals = sessionSignals?.recentDismissalsForStep ?? 0;
  let nudgeLevel = 0;
  let memoryDriven = false;
  let sessionDriven = false;

  if (nudgeStats.dismissed >= 5 && nudgeStats.dismissRate >= 0.75) {
    nudgeLevel = 2;
    memoryDriven = true;
  } else if (nudgeStats.dismissed >= 3 && nudgeStats.dismissRate >= 0.6) {
    nudgeLevel = 1;
    memoryDriven = true;
  }

  if (sessionDismissals >= 3) {
    nudgeLevel = Math.max(nudgeLevel, 2);
    sessionDriven = true;
  } else if (sessionDismissals >= 2) {
    nudgeLevel = Math.max(nudgeLevel, 1);
    sessionDriven = true;
  }

  if (nudgeLevel === 1) {
    nudgePolicy.minSecondsBetweenNudges = DEFAULT_NUDGE_POLICY.minSecondsBetweenNudges + 10;
    nudgePolicy.suppressForStepMs = DEFAULT_NUDGE_POLICY.suppressForStepMs + 5_000;
    details.push("Nudge cooldown increased due to frequent dismissals.");
  } else if (nudgeLevel >= 2) {
    nudgePolicy.minSecondsBetweenNudges = DEFAULT_NUDGE_POLICY.minSecondsBetweenNudges + 20;
    nudgePolicy.suppressForStepMs = DEFAULT_NUDGE_POLICY.suppressForStepMs + 10_000;
    details.push("Nudge cooldown increased significantly due to frequent dismissals.");
  }

  if (memoryDriven) sources.add("inferred");
  if (sessionDriven) sources.add("session");

  if (reasonCodes.size === 0 && memory?.topReasonCodes?.length) {
    memory.topReasonCodes.forEach((code) => reasonCodes.add(code));
  }

  if (sources.size === 0) sources.add("default");

  const changes = (Object.keys(settings) as Array<keyof PersonalizationSettings>)
    .filter((field) => settings[field] !== DEFAULT_SETTINGS[field])
    .map((field) => ({
      field,
      source: fieldSources[field],
      value: settings[field],
    }));

  const summary = buildSummary({
    disabled: false,
    changes,
    sources,
    hasRecentReexplains: countRecentReexplains(memory, nowMs) >= 2,
    paceSource: fieldSources.pace,
    paceValue: settings.pace,
    conceptBiasApplied: conceptBiasAppliedPace || conceptBiasAppliedVerbosity,
    conceptBiasAppliedPace,
    conceptBiasAppliedVerbosity,
  });

  return {
    settings,
    nudgePolicy,
    explanation: {
      summary,
      reasonCodes: uniqueList(reasonCodes),
      sources: uniqueList(sources),
      details: details.length > 0 ? details : undefined,
    },
  };
}

export function evaluatePolicy(memory: StudentMemoryDoc): PersonalizationDecision {
  return decidePersonalization({ studentMemoryDoc: memory });
}
