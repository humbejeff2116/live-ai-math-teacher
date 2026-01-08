import { getRandomEquation } from "../../teaching/equations";
import { GeminiClient } from "../../gemini/client";
import { TeachingState } from "../types/teaching";

export async function startTeachingSession() {
  const { sessionId } = { sessionId: '' };
  const equation = getRandomEquation();

  const state: TeachingState = {
    equation: equation.equation,
    expectedAnswer: equation.answer,
    stepIndex: 0,
    attempts: 0,
    confusionLevel: "low",
    mode: "direct",
    solved: false,
  };

  const gemini = new GeminiClient();
  // TODO... fix bug - compute sessionId
  const session = gemini.createLiveAdapter(sessionId);

  await session.speak(state);

  return { sessionId: "live-session-id", state };
}
