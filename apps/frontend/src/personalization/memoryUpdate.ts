import type {
  ConceptStat,
  EvidenceEvent,
  ReasonCode,
  StudentMemoryDoc,
} from "./schema";

export type PersonalizationEvent = EvidenceEvent;

const EVIDENCE_MAX = 50;
const REEXPLAIN_WEIGHT = 0.75;
const DISMISS_WEIGHT = 0.5;
const CONCEPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_REASON_MAX = 3;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getConceptIds = (event: EvidenceEvent): string[] =>
  event.conceptIds?.filter(Boolean) ?? [];

const updateTopReasonCodes = (
  prior: ReasonCode[] | undefined,
  evidence: EvidenceEvent[],
): ReasonCode[] | undefined => {
  const counts = new Map<ReasonCode, number>();
  for (const event of evidence) {
    if (!event.reason) continue;
    counts.set(event.reason, (counts.get(event.reason) ?? 0) + 1);
  }
  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_REASON_MAX)
    .map(([reason]) => reason);
  if (ranked.length === 0) return prior;
  return ranked;
};

/**
 * Applies a single personalization event, updating bounded evidence and simple
 * aggregates only. No raw transcripts or audio are stored.
 */
export function applyPersonalizationEvent(
  memory: StudentMemoryDoc,
  event: PersonalizationEvent,
): StudentMemoryDoc {
  const now = Date.now();
  const evidence = [...(memory.evidenceEvents ?? []), event].slice(-EVIDENCE_MAX);
  const conceptIds = getConceptIds(event);

  const nextConceptStats = memory.conceptStats
    ? { ...memory.conceptStats }
    : undefined;

  if (conceptIds.length > 0) {
    const ensureStat = (conceptId: string) => {
      if (!nextConceptStats) return null;
      const existing = nextConceptStats[conceptId];
      if (existing) return existing;
      const created: ConceptStat = {
        conceptId,
        totalAttempts: 0,
        confusionCount: 0,
      };
      nextConceptStats[conceptId] = created;
      return created;
    };

    const isConfirmed = event.type === "confusion_confirmed";
    const isDismissed = event.type === "confusion_dismissed";
    const isReExplain =
      event.type === "reexplain_started" || event.type === "reexplain_completed";

    for (const conceptId of conceptIds) {
      if (!nextConceptStats) break;
      const stat = ensureStat(conceptId);
      if (!stat) continue;

      if (isConfirmed) {
        stat.confusionCount += 1;
        stat.lastConfusedAtMs = event.atMs;
      }
      if (isDismissed) {
        stat.dismissedCount = (stat.dismissedCount ?? 0) + 1;
      }
      if (isReExplain) {
        stat.reExplainCount = (stat.reExplainCount ?? 0) + 1;
      }
      stat.totalAttempts += 1;
      stat.expiresAtMs = now + CONCEPT_TTL_MS;

      const seenCount = Math.max(1, stat.totalAttempts);
      const rawScore =
        (stat.confusionCount +
          REEXPLAIN_WEIGHT * (stat.reExplainCount ?? 0) -
          DISMISS_WEIGHT * (stat.dismissedCount ?? 0)) /
        seenCount;
      stat.difficultyScore = clamp01(rawScore);
    }
  }

  const topReasonCodes = updateTopReasonCodes(
    memory.topReasonCodes,
    evidence,
  );

  return {
    ...memory,
    evidenceEvents: evidence,
    conceptStats: nextConceptStats,
    topReasonCodes,
    updatedAtMs: now,
  };
}
