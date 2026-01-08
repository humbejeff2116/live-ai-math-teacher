import { GeminiLiveSession } from "./GeminiLiveSession";
import { getSessionSocket } from "../../transport/wsSessionHub";
import { TeachingState } from "../../types/teaching";
import { modePrompt } from "../prompts/modes";
import { geminiLiveConfig } from "./GeminiLiveConfig";
import { getBaseSystemPrompt } from "../prompts/base";

export class GeminiLiveAdapter {
  private session: GeminiLiveSession;

  constructor(private sessionId: string) {
    this.session = new GeminiLiveSession({
      systemPrompt: geminiLiveConfig.systemInstruction,
      voice: "teacher",
      video: true,
    });
  }

  async start() {
    await this.session.start();
    this.pipeStream();
  }

  async speak(state: TeachingState) {
    const basePrompt = getBaseSystemPrompt();

    const prompt = `
    ${basePrompt}

    Equation: ${state.equation}
    Teaching mode: ${state.mode}
    Confusion level: ${state.confusionLevel}

    ${modePrompt(state.mode)}
    `;
    
    await this.session.sendPrompt(prompt);
  }

  private async pipeStream() {
    const socket = getSessionSocket(this.sessionId);
    if (!socket) return;

    for await (const chunk of this.session.stream()) {
      if (socket.readyState !== socket.OPEN) break;

      socket.send(
        JSON.stringify({
          type: "media",
          mediaType: chunk.type,
          payload: chunk.data,
        })
      );
    }
  }

  async stop() {
    await this.session.stop();
  }
}
