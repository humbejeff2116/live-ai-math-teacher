import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV ?? "development";

// Compute repo root + backend dir based on this file location (stable)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In dev (tsx), this file is at apps/backend/src/config/env.ts
// In prod (dist), it’s at apps/backend/dist/config/env.js
// So backendDir is always .../apps/backend
const backendDir = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(backendDir, "..", "..");

// Prefer explicit DOTENV_PATH if provided.
// Otherwise try common locations in order.
async function findDotenvPath(): Promise<string | undefined> {
  if (process.env.DOTENV_PATH) return process.env.DOTENV_PATH;

  const candidates = [
    path.join(backendDir, ".env"), // apps/backend/.env (works when running filtered)
    path.join(repoRoot, "apps/backend/.env"), // repo-root run
    path.join(repoRoot, ".env"), // optional fallback
  ];

  for (const p of candidates) {
    // Don’t import fs at top-level unless needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = await import("node:fs");
    if (fs.existsSync(p)) return p;
  }

  return undefined;
}

// if (nodeEnv !== "production") {
  const dotenvPath = await findDotenvPath();
  if (dotenvPath) {
    dotenv.config({ path: dotenvPath });
  } else {
    // Optional: don’t hard-crash just because .env is missing
    // (You still hard-crash later if required vars are missing)
    console.warn("[env] No .env file found; relying on process.env");
  }
// }

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var: ${name} (NODE_ENV=${nodeEnv}). ` +
        `Dev: put it in apps/backend/.env (or set DOTENV_PATH). ` +
        `Prod: set it in Cloud Run env vars / Secret Manager.`,
    );
  }
  return value;
}

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3001),
  publicDir: process.env.PUBLIC_DIR,

  gemini: {
    apiKey: requireEnv("GEMINI_API_KEY"),
    projectId: requireEnv("GEMINI_PROJECT_ID"),
    liveWsUrl: requireEnv("GEMINI_LIVE_WS_URL"),
  },
};
