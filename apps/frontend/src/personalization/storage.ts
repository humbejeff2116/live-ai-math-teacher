export type PersonalizationStorage = {
  read: () => unknown | null;
  write: (data: unknown) => void;
  clear: () => void;
};

export function createInMemoryStorage(): PersonalizationStorage {
  let cache: unknown | null = null;
  return {
    read: () => cache,
    write: (data) => {
      cache = data;
    },
    clear: () => {
      cache = null;
    },
  };
}
