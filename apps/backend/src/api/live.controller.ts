import { Request, Response, Router } from "express";
import { liveSessionManager } from "../gemini/live/liveSessionManager";

export const liveRouter = Router();

liveRouter.post("/session", async (_req: Request, res: Response) => {
  try {
    const session = await liveSessionManager.createSession();

    res.status(201).json({
      sessionId: session.sessionId,
      state: session.state,
    });
  } catch (err) {
    console.error("Failed to create live session", err);
    res.status(500).json({ error: "Failed to initialize live session" });
  }
});
