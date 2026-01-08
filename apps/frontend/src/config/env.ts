

function requireEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing frontend env var: ${name}`);
  }
  return value;
}

export const env = {
  apiBaseUrl: requireEnv("VITE_API_BASE_URL"),
};
