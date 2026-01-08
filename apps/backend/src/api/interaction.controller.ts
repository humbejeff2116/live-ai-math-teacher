import { Request, Response } from "express";
import { getSession, updateSession } from "../../session/sessionStore";
import { handleStudentInteraction } from "../../session/interactionLoop";
import { GeminiClient } from "../../gemini/client";

export async function postInteraction(req: Request, res: Response) {
  const { sessionId, transcript, silenceMs } = req.body;

  if (!sessionId || !transcript) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const state = getSession(sessionId);
  const gemini = new GeminiClient().createLiveAdapter(sessionId);

  const nextState = await handleStudentInteraction(
    state,
    { transcript, silenceMs },
    gemini
  );

  updateSession(sessionId, nextState);

  res.json({
    solved: nextState.solved,
    mode: nextState.mode,
    confusionLevel: nextState.confusionLevel,
    attempts: nextState.attempts,
    equation: nextState.equation,
  });
}
