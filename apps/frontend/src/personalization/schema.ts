import type { ConfusionReason } from "@shared/types";

export type ReasonCode = ConfusionReason | "manual" | "unknown";

export type PacePreference = "slow" | "steady" | "fast";
export type VerbosityPreference = "concise" | "balanced" | "detailed";
export type ModalityPreference = "visual" | "verbal" | "mixed";
export type TeachingStylePreference =
  | "guided"
  | "socratic"
  | "visual"
  | "concise";

export type PreferenceEstimate<T> = {
  value: T;
  confidence: number;
  updatedAtMs: number;
  reason?: ReasonCode;
};

export type PreferenceEstimates = {
  pace?: PreferenceEstimate<PacePreference>;
  verbosity?: PreferenceEstimate<VerbosityPreference>;
  modality?: PreferenceEstimate<ModalityPreference>;
  teachingStyle?: PreferenceEstimate<TeachingStylePreference>;
  explainEveryStep?: PreferenceEstimate<boolean>;
};

export type ConceptStat = {
  conceptId: string;
  totalAttempts: number;
  confusionCount: number;
  dismissedCount?: number;
  reExplainCount?: number;
  difficultyScore?: number;
  expiresAtMs?: number;
  lastConfusedAtMs?: number;
  lastSuccessAtMs?: number;
};

/**
 * Evidence events are bounded summaries; never store raw transcripts/audio.
 */
export type EvidenceEvent =
  | {
      type: "confusion_confirmed" | "confusion_dismissed";
      stepId: string;
      atMs: number;
      reason?: ReasonCode;
      conceptIds?: string[];
    }
  | {
      type: "reexplain_started" | "reexplain_completed";
      stepId: string;
      atMs: number;
      reason?: ReasonCode;
      conceptIds?: string[];
    }
  | {
      type: "nudge_shown" | "nudge_dismissed";
      stepId: string;
      atMs: number;
      reason?: ReasonCode;
      conceptIds?: string[];
    };

export type StudentMemoryDoc = {
  schemaVersion: 1;
  createdAtMs: number;
  updatedAtMs: number;
  /**
   * Aggregated preferences only; no raw transcripts/audio stored.
   */
  preferenceEstimates?: PreferenceEstimates;
  /**
   * Lightweight concept stats; keys should be canonical concept ids.
   */
  conceptStats?: Record<string, ConceptStat>;
  /**
   * Small bounded evidence list; never store raw transcripts/audio.
   */
  evidenceEvents?: EvidenceEvent[];
  /**
   * Recent top reason codes inferred from evidence; no raw transcripts/audio stored.
   */
  topReasonCodes?: ReasonCode[];
};

export type ExplicitPreferences = {
  schemaVersion: 1;
  updatedAtMs: number;
  pace?: PacePreference;
  verbosity?: VerbosityPreference;
  modality?: ModalityPreference;
  teachingStyle?: TeachingStylePreference;
  explainEveryStep?: boolean;
  disabledPersonalization?: boolean;
};

export function createEmptyStudentMemory(nowMs: number): StudentMemoryDoc {
  return {
    schemaVersion: 1,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
}
