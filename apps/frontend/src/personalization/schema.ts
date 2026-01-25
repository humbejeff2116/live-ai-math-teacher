export type PersonalizationSchemaVersion = 1;

export type PersonalizationMemory = {
  schemaVersion: PersonalizationSchemaVersion;
  createdAtMs: number;
  updatedAtMs: number;
  // TODO: fill with Week-3 memory layers.
};

export function createEmptyMemory(nowMs: number): PersonalizationMemory {
  return {
    schemaVersion: 1,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
}
