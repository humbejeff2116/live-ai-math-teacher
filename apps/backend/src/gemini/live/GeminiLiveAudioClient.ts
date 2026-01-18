import WebSocket from "ws";
import { env } from "../../config/env";


type StepAudioHooks = {
  // stepId: string | null;
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
  private readyPromise: Promise<void>;
  private activeStepId: string | null = null;
  // Track the resolver for the current speaking task
  private currentTurnResolver: (() => void) | null = null;

  constructor(
    onAudioChunk: (chunk: Buffer, stepId: string | null) => void,
    private hooks: StepAudioHooks
  ) {
    this.ws = new WebSocket(env.gemini.liveWsUrl, {
      headers: {
        Authorization: `Bearer ${env.gemini.apiKey}`,
      },
    });

    // 1. Improved Ready Logic: Check current state + handle failures
    this.readyPromise = new Promise((resolve, reject) => {
      const onOpen = async () => {
        console.log("WS live audio client is open. Sending setup...");
        this.sendSetup();
        console.log("GeminiLiveAudioClient::Connection Ready");
        resolve();
      };

      if (this.ws.readyState === WebSocket.OPEN) {
        onOpen();
      } else {
        this.ws.once("open", onOpen);
        this.ws.once("error", (err) => {
          console.error("GeminiLiveAudioClient failed to connect:", err);
          reject(err);
        });
      }
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log("GeminiLiveAudioClient::Received message", JSON.stringify(msg).slice(0, 200));

        // Handle Audio
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData?.data) {
              onAudioChunk(
                Buffer.from(part.inlineData.data, "base64"),
                this.activeStepId
              );
            }
          }
        }

        // Handle Turn Completion
        if (msg.serverContent?.turnComplete) {
          console.log(
            "GeminiLiveAudioClient::Turn Complete for step:",
            this.activeStepId
          );
          if (this.currentTurnResolver) {
            this.currentTurnResolver();
            this.currentTurnResolver = null;
          }
        }
      } catch (err) {
        console.error("Error parsing Gemini message:", err);
      }
    });
  }

  // Moved setup to a private method for clarity
  private sendSetup() {
    const setup = {
      setup: {
        model: "models/gemini-2.0-flash-exp", // Standard stable ID for 2026
        generation_config: {
          response_modalities: ["audio"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: { voice_name: "Puck" },
            },
          },
        },
      },
    };
    this.ws.send(JSON.stringify(setup));
  }

  async speakStep(stepId: string, text: string): Promise<void> {
    console.log(`GeminiLiveAudioClient::Preparing to speak step: ${stepId}`);

    try {
      await this.readyPromise;
      if (this.active === false) {
        console.warn(
          `speakStep[${stepId}] skipped: client is inactive/interrupted`
        );
        return;
      }

      return new Promise((resolve) => {
        this.activeStepId = stepId;

        this.currentTurnResolver = () => {
          this.hooks.onStepEnd(stepId);
          resolve();
        };

        this.hooks.onStepStart(stepId);
        this.sendTextPrompt(text);
      });
    } catch (err) {
      console.error(
        `GeminiLiveAudioClient::speakStep failed for ${stepId}:`,
        err
      );
    }
  }

  async sendTextPrompt(text: string) {
    if (this.active === false || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      // Gemini Multimodal Live API format
      const payload = {
        client_content: {
          turns: [{ role: "user", parts: [{ text }] }],
          turn_complete: true, // Tells Gemini to signal when finished
        },
      };
      this.ws.send(JSON.stringify(payload), (err) => {
        if (err) {
          console.error("Error sending text prompt:", err);
        }
        console.log("Sent text prompt to Gemini Live Audio API");
      });
    } catch (err) {
      console.error("Error sending text prompt:", err);
    }
  }

  // Critical: If we stop/interrupt, we must resolve any pending promises
  stop() {
    this.active = false;
    if (this.currentTurnResolver) {
      this.currentTurnResolver();
      this.currentTurnResolver = null;
    }
  }

  resume() {
    this.active = true;
  }

  close() {
    this.ws.close();
  }
}

