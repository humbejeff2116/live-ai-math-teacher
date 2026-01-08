import { TeachingMode, TeachingState } from "../types/teaching";

export function nextTeachingMode(state: TeachingState): TeachingMode {
  if (state.confusionLevel === "high") {
    return state.attempts >= 3 ? "encouragement" : "visual";
  }

  switch (state.attempts) {
    case 0:
      return "direct";
    case 1:
      return "step_by_step";
    case 2:
      return "analogy";
    default:
      return "visual";
  }
}

export function advanceState(
  state: TeachingState,
  correct: boolean,
  confusionLevel: TeachingState["confusionLevel"]
): TeachingState {
  if (correct) {
    return {
      ...state,
      solved: true,
    };
  }

  return {
    ...state,
    attempts: state.attempts + 1,
    confusionLevel,
    mode: nextTeachingMode(state),
  };
}
