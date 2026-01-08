import { TeachingState } from "../types/teaching";
import { StudentInteraction } from "../types/interaction";
import { evaluateAnswer } from "../../teaching/evaluator";
import { calculateConfusionLevel } from "../../teaching/confusion";
import { advanceState } from "../../teaching/stateMachine";
import { GeminiLiveAdapter } from "../../gemini/live/GeminiLiveAdapter";

export async function handleStudentInteraction(
  state: TeachingState,
  interaction: StudentInteraction,
  gemini: GeminiLiveAdapter
): Promise<TeachingState> {
  const correct = evaluateAnswer(interaction.transcript, state.expectedAnswer);

  const confusionLevel = calculateConfusionLevel(state.confusionLevel, {
    silenceMs: interaction.silenceMs,
    incorrect: !correct,
    repeatedMistake: state.attempts >= 1 && !correct,
    explicitConfusion: /i don't get it|confused|don't understand/i.test(
      interaction.transcript
    ),
  });

  const nextState = advanceState(state, correct, confusionLevel);
  // Ask Gemini to respond based on the NEW state
  await gemini.speak(nextState);

  return nextState;
}
