import WebSocket from "ws";
import { env } from "../../config/env";


type StepAudioHooks = {
  onStepStart(stepId: string): void;
  onStepEnd(stepId: string): void;
};

/**
 * Low-level Gemini Live audio stream client
 * (Audio-only for now; video later)
 */
export class GeminiLiveAudioClient {
  private ws: WebSocket;
  private active = true;

  constructor(
    onAudioChunk: (chunk: Buffer) => void,
    private hooks: StepAudioHooks
  ) {
    this.ws = new WebSocket(env.gemini.liveWsUrl, {
      headers: {
        Authorization: `Bearer ${env.gemini.apiKey}`,
      },
    });

    this.ws.on("open", () => {
      console.log("WS live audio client is open");
    });

    this.ws.on("message", (data) => {
      if (!this.active) return;

      const msg = JSON.parse(data.toString());
      //TODO... should this be ai_audio_chunk?
      if (msg.type === "audio_chunk") {
        onAudioChunk(Buffer.from(msg.payload, "base64"));
      }
    });
  }

  async speakStep(stepId: string, text: string) {
    this.hooks.onStepStart(stepId);

    // send to Gemini TTS
    await this.sendTextPrompt(text);

    this.hooks.onStepEnd(stepId);
  }

  async sendTextPrompt(text: string) {
    if (!this.active) return;

    this.ws.send(
      JSON.stringify({
        type: "text_input",
        payload: {
          text,
          voice: "en-US-neutral",
        },
      })
    );
  }

  stop() {
    // ✅ Stop emitting audio without closing socket
    this.active = false;
  }

  resume() {
    this.active = true;
  }

  close() {
    this.ws.close();
  }
}

