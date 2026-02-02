import express from "express";
import cors from "cors";
import path from "node:path";
import { env } from "./config/env.js";

export const app = express();

if (process.env.NODE_ENV !== "production") app.use(
  cors({
    origin: env.allowedOrigins,
  }),
);

app.use(express.json());

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

/**
 * Static frontend (when running as a single container).
 * We’ll copy frontend build output into this folder in the Dockerfile.
 *
 * Expected path inside container:
 *   /app/public (contains index.html, assets/, etc)
 */
if (process.env.NODE_ENV === "production") {
  console.log("Serving static frontend files");
  const publicDir =
    process.env.PUBLIC_DIR ?? path.resolve(process.cwd(), "public");

    console.log(`Using publicDir: ${publicDir}`);

  app.use(express.static(publicDir));

  // Express 5-safe SPA fallback
  app.get(/.*/, (req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.includes(".") || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(publicDir, "index.html"));
  });
}