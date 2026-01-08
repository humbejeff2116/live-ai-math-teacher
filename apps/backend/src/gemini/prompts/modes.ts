import { TeachingMode } from "../../types/teaching";

export function modePrompt(mode: TeachingMode): string {
  switch (mode) {
    case "direct":
      return "Explain the equation clearly and ask one simple question.";
    case "step_by_step":
      return "Break the solution into numbered steps and pause after each.";
    case "analogy":
      return "Use a balance scale analogy with physical objects.";
    case "visual":
      return "Describe numbers moving across the equals sign visually.";
    case "encouragement":
      return "Slow down, reassure the student, and restate the goal.";
  }
}
