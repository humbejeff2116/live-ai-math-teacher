import {
  type ExplicitPreferences,
  type StudentMemoryDoc,
  createEmptyStudentMemory,
} from "./schema";
import {
  CANONICAL_CONCEPT_ALIASES,
  normalizeConceptIds,
} from "./conceptNormalization";

export const STUDENT_ID = "local";
const STUDENT_MEMORY_KEY = "rtmt.studentMemory.v1";
const EXPLICIT_PREFS_KEY = "rtmt.explicitPreferences.v1";
const EVIDENCE_MAX = 50;
const PREF_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CONCEPT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const getStorageKey = (base: string, studentId: string) =>
  `${base}.${studentId}`;

const getLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage ?? null;
};

const safeParse = (raw: string | null): unknown | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export function purgeExpired(doc: StudentMemoryDoc): StudentMemoryDoc {
  const now = Date.now();
  const next: StudentMemoryDoc = { ...doc };

  if (next.preferenceEstimates) {
    const entries = Object.entries(next.preferenceEstimates).filter(([, v]) => {
      if (!v?.updatedAtMs) return true;
      return now - v.updatedAtMs <= PREF_TTL_MS;
    });
    next.preferenceEstimates =
      entries.length > 0
        ? (Object.fromEntries(entries) as StudentMemoryDoc["preferenceEstimates"])
        : undefined;
  }

  if (next.conceptStats) {
    const entries = Object.entries(next.conceptStats).filter(([, v]) => {
      if (v.expiresAtMs != null) return v.expiresAtMs > now;
      const lastTouched = Math.max(
        v.lastConfusedAtMs ?? 0,
        v.lastSuccessAtMs ?? 0,
      );
      if (!lastTouched) return true;
      return now - lastTouched <= CONCEPT_TTL_MS;
    });
    next.conceptStats =
      entries.length > 0
        ? (Object.fromEntries(entries) as StudentMemoryDoc["conceptStats"])
        : undefined;
  }

  if (next.evidenceEvents && next.evidenceEvents.length > EVIDENCE_MAX) {
    next.evidenceEvents = next.evidenceEvents.slice(-EVIDENCE_MAX);
  }

  return next;
}

const canonicalizeConceptId = (conceptId: string) =>
  CANONICAL_CONCEPT_ALIASES[conceptId] ?? conceptId;

const normalizeStudentMemoryConcepts = (
  doc: StudentMemoryDoc,
): StudentMemoryDoc => {
  try {
    let changed = false;
    const next: StudentMemoryDoc = { ...doc };

    if (next.evidenceEvents && next.evidenceEvents.length > 0) {
      next.evidenceEvents = next.evidenceEvents.map((event) => {
        if (!event.conceptIds || event.conceptIds.length === 0) return event;
        const normalized = normalizeConceptIds(event.conceptIds);
        if (
          normalized.length === event.conceptIds.length &&
          normalized.every((id, idx) => id === event.conceptIds?.[idx])
        ) {
          return event;
        }
        changed = true;
        return {
          ...event,
          conceptIds: normalized.length > 0 ? normalized : undefined,
        };
      });
    }

    if (next.conceptStats) {
      const merged: StudentMemoryDoc["conceptStats"] = {};
      for (const [conceptId, stat] of Object.entries(next.conceptStats)) {
        const canonicalId = canonicalizeConceptId(conceptId);
        if (canonicalId !== conceptId) changed = true;
        const existing = merged[canonicalId];
        if (!existing) {
          merged[canonicalId] = { ...stat, conceptId: canonicalId };
          continue;
        }
        changed = true;
        merged[canonicalId] = {
          ...existing,
          conceptId: canonicalId,
          totalAttempts: (existing.totalAttempts ?? 0) + (stat.totalAttempts ?? 0),
          confusionCount: (existing.confusionCount ?? 0) + (stat.confusionCount ?? 0),
          dismissedCount: (existing.dismissedCount ?? 0) + (stat.dismissedCount ?? 0),
          reExplainCount: (existing.reExplainCount ?? 0) + (stat.reExplainCount ?? 0),
          difficultyScore: Math.max(
            existing.difficultyScore ?? 0,
            stat.difficultyScore ?? 0,
          ),
          lastConfusedAtMs: Math.max(
            existing.lastConfusedAtMs ?? 0,
            stat.lastConfusedAtMs ?? 0,
          ) || undefined,
          lastSuccessAtMs: Math.max(
            existing.lastSuccessAtMs ?? 0,
            stat.lastSuccessAtMs ?? 0,
          ) || undefined,
          expiresAtMs: Math.max(
            existing.expiresAtMs ?? 0,
            stat.expiresAtMs ?? 0,
          ) || undefined,
        };
      }
      if (changed) next.conceptStats = merged;
    }

    return changed ? next : doc;
  } catch {
    return doc;
  }
};

export function migrateStudentMemory(raw: unknown): StudentMemoryDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<StudentMemoryDoc>;
  if (candidate.schemaVersion !== 1) return null;
  if (typeof candidate.createdAtMs !== "number") return null;
  if (typeof candidate.updatedAtMs !== "number") return null;
  return candidate as StudentMemoryDoc;
}

export function migrateExplicitPreferences(
  raw: unknown,
): ExplicitPreferences | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ExplicitPreferences>;
  if (candidate.schemaVersion !== 1) return null;
  if (typeof candidate.updatedAtMs !== "number") return null;
  return candidate as ExplicitPreferences;
}

export function loadStudentMemory(studentId = STUDENT_ID): StudentMemoryDoc {
  const storage = getLocalStorage();
  const key = getStorageKey(STUDENT_MEMORY_KEY, studentId);
  const raw = storage ? safeParse(storage.getItem(key)) : null;
  const migrated = migrateStudentMemory(raw);
  const base = migrated ?? createEmptyStudentMemory(Date.now());
  const normalized = normalizeStudentMemoryConcepts(base);
  const next = purgeExpired(normalized);
  if (!migrated && storage) {
    storage.setItem(key, JSON.stringify(next));
  }
  return next;
}

export function saveStudentMemory(
  doc: StudentMemoryDoc,
  studentId = STUDENT_ID,
): void {
  const storage = getLocalStorage();
  if (!storage) return;
  const key = getStorageKey(STUDENT_MEMORY_KEY, studentId);
  const now = Date.now();
  const next = purgeExpired({ ...doc, updatedAtMs: now });
  storage.setItem(key, JSON.stringify(next));
}

export function loadExplicitPreferences(
  studentId = STUDENT_ID,
): ExplicitPreferences {
  const storage = getLocalStorage();
  const key = getStorageKey(EXPLICIT_PREFS_KEY, studentId);
  const raw = storage ? safeParse(storage.getItem(key)) : null;
  const migrated = migrateExplicitPreferences(raw);
  const base: ExplicitPreferences = migrated ?? {
    schemaVersion: 1,
    updatedAtMs: Date.now(),
    disabledPersonalization: false,
  };
  if (!migrated && storage) {
    storage.setItem(key, JSON.stringify(base));
  }
  return base;
}

export function saveExplicitPreferences(
  prefs: ExplicitPreferences,
  studentId = STUDENT_ID,
): void {
  const storage = getLocalStorage();
  if (!storage) return;
  const key = getStorageKey(EXPLICIT_PREFS_KEY, studentId);
  storage.setItem(
    key,
    JSON.stringify({ ...prefs, updatedAtMs: Date.now() }),
  );
}

export function resetPersonalization(studentId = STUDENT_ID): void {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem(getStorageKey(STUDENT_MEMORY_KEY, studentId));
  storage.removeItem(getStorageKey(EXPLICIT_PREFS_KEY, studentId));
}
