import WebSocket from "ws";
import { env } from "../../config/env";

/**
 * Low-level Gemini Live audio stream client
 * (Audio-only for now; video later)
 */
export class GeminiLiveAudioClient {
  private ws: WebSocket;
  private active = true;

  constructor(onAudioChunk: (chunk: Buffer) => void) {
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
      if (msg.type === "audio_chunk") {
        onAudioChunk(Buffer.from(msg.payload, "base64"));
      }
    });
  }

  sendTextPrompt(text: string) {
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

