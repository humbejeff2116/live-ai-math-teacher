export const CANONICAL_CONCEPT_ALIASES: Record<string, string> = {
  "linear.solve": "equations.solve",
  "fractions.lcm": "fractions.common_denominator",
  "roots.rules": "roots.radicals",
};

const addUnique = (list: string[], value: string) => {
  if (!value) return;
  if (!list.includes(value)) list.push(value);
};

export function normalizeConceptIds(conceptIds: string[]): string[] {
  if (!conceptIds || conceptIds.length === 0) return [];

  const normalized: string[] = [];

  for (const rawId of conceptIds) {
    if (!rawId) continue;
    const canonical = CANONICAL_CONCEPT_ALIASES[rawId] ?? rawId;
    addUnique(normalized, canonical);
  }

  const withParents = [...normalized];
  for (const id of normalized) {
    const dotIndex = id.indexOf(".");
    if (dotIndex > 0) {
      const parent = id.slice(0, dotIndex);
      addUnique(withParents, parent);
    }
  }

  return withParents;
}
