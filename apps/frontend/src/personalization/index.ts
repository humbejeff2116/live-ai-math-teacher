import type { EvidenceEvent, ExplicitPreferences, ReasonCode, StudentMemoryDoc } from "./schema";
import { applyPersonalizationEvent } from "./memoryUpdate";
import { loadExplicitPreferences, loadStudentMemory, saveStudentMemory } from "./storage";
import { decidePersonalization, type PersonalizationDecision, type SessionContext, type SessionSignals } from "./policyEngine";

export type PersonalizationInitState = {
  studentMemoryDoc: StudentMemoryDoc;
  explicitPreferences: ExplicitPreferences;
};

export type PersonalizationEventInput = {
  type: EvidenceEvent["type"];
  stepId: string;
  stepType?: string;
  conceptIds?: string[];
  reason?: ReasonCode;
  reasonCodes?: ReasonCode[];
  atMs?: number;
};

export type PersonalizationDecisionContext = {
  sessionContext?: SessionContext;
  sessionSignals?: SessionSignals;
  nowMs?: number;
};

const isBrowser = () => typeof window !== "undefined";

export function initPersonalization(): PersonalizationInitState | null {
  if (!isBrowser()) return null;
  return {
    studentMemoryDoc: loadStudentMemory(),
    explicitPreferences: loadExplicitPreferences(),
  };
}

export function recordEvent(event: PersonalizationEventInput): void {
  if (!isBrowser()) return;
  if (!event?.type || !event?.stepId) return;

  const nowMs = Date.now();
  const reason = event.reason ?? event.reasonCodes?.[0];
  const evidence: EvidenceEvent = {
    type: event.type,
    stepId: event.stepId,
    atMs: event.atMs ?? nowMs,
    reason,
    conceptIds:
      event.conceptIds && event.conceptIds.length > 0
        ? event.conceptIds
        : undefined,
  };

  const memory = loadStudentMemory();
  const next = applyPersonalizationEvent(memory, evidence);
  saveStudentMemory(next);
}

export function getDecision(
  context: PersonalizationDecisionContext = {},
): PersonalizationDecision {
  if (!isBrowser()) {
    return decidePersonalization({
      sessionContext: context.sessionContext,
      sessionSignals: context.sessionSignals,
      nowMs: context.nowMs,
    });
  }

  const memory = loadStudentMemory();
  const prefs = loadExplicitPreferences();
  return decidePersonalization({
    studentMemoryDoc: memory,
    explicitPreferences: prefs,
    sessionContext: context.sessionContext,
    sessionSignals: context.sessionSignals,
    nowMs: context.nowMs,
  });
}
