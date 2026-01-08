import { GeminiLiveConfig, GeminiMediaChunk } from "./GeminiLiveTypes";


export class GeminiLiveSession {
  private active = false;

  constructor(private config: GeminiLiveConfig) {}

  async start(): Promise<void> {
    // Initialize Gemini Live session
    // Authenticate, allocate stream, etc.
    this.active = true;
  }

  async sendPrompt(prompt: string): Promise<void> {
    if (!this.active) {
      throw new Error("Session not started");
    }

    // Send prompt to Gemini Live
    // Gemini begins streaming audio/video in response
  }

  async *stream(): AsyncGenerator<GeminiMediaChunk> {
    if (!this.active) return;

    // Pseudo-stream from Gemini Live
    while (this.active) {
      const chunk = await this.readChunkFromGemini();
      if (!chunk) break;
      yield chunk;
    }
  }

  async stop(): Promise<void> {
    this.active = false;
    // Close Gemini Live session
  }

  private async readChunkFromGemini(): Promise<GeminiMediaChunk | null> {
    // Placeholder: real SDK would push these
    return null;
  }
}
