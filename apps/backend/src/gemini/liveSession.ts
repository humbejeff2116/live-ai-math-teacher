import { BASE_SYSTEM_PROMPT } from "./prompts/base";
import { modePrompt } from "./prompts/modes";
import { TeachingState } from "../types/teaching";

export class GeminiLiveSession {
  async speak(state: TeachingState): Promise<void> {
    const prompt = `
    ${BASE_SYSTEM_PROMPT}

    Equation: ${state.equation}
    Teaching mode: ${state.mode}
    Confusion level: ${state.confusionLevel}

    ${modePrompt(state.mode)}
    `;

      // Gemini Live API call here
      // streamAudioVideo(prompt)
  }
}
