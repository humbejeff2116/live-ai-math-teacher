import WebSocket from "ws";
import { env } from "../../config/env.js";


type StepAudioHooks = {
  // stepId: string | null;
  onStepStart(stepId: string): void;
  onStepEnd(stepId: string): void;
};

const DEFAULT_GEMINI_LIVE_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

function buildLiveWsUrl(baseUrl: string, apiKey: string): string {
  const resolvedBaseUrl =
    baseUrl && baseUrl.trim().length > 0 ? baseUrl : DEFAULT_GEMINI_LIVE_WS_URL;
  const url = new URL(resolvedBaseUrl);
  if (url.pathname.includes("v1alpha")) {
    url.pathname = url.pathname.replace("v1alpha", "v1beta");
  }
  if (!url.searchParams.has("key")) {
    url.searchParams.set("key", apiKey);
  }
  return url.toString();
}


/**
 * Low-level Gemini Live audio stream client
 * (Audio-only for now; video later)
 */
export class GeminiLiveAudioClient {
  private ws: WebSocket;
  private active = true;
  private readyPromise: Promise<void>;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((err: Error) => void) | null = null;
  private setupTimeout: NodeJS.Timeout | null = null;
  private activeStepId: string | null = null;
  // Track the resolver for the current speaking task
  private currentTurnResolver: (() => void) | null = null;
  private currentTurnDidStart = false;
  private stoppedPromise: Promise<void>;
  private resolveStopped: (() => void) | null = null;
  private setupComplete = false;
  private inboundLogCount = 0;

  constructor(
    onAudioChunk: (chunk: Buffer, stepId: string | null) => void,
    private hooks: StepAudioHooks
  ) {
    this.ws = new WebSocket(
      buildLiveWsUrl(env.gemini.liveWsUrl, env.gemini.apiKey)
    );

    this.readyPromise = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    this.stoppedPromise = new Promise((resolve) => {
      this.resolveStopped = resolve;
    });

    const onOpen = () => {
      console.log("GeminiLiveAudioClient::WS open. Sending setup...");
      this.sendSetup();
      this.setupTimeout = setTimeout(() => {
        if (!this.setupComplete) {
          const err = new Error("GeminiLiveAudioClient setup timeout");
          console.error(err.message);
          this.rejectReady?.(err);
        }
      }, 10000);
    };

    if (this.ws.readyState === WebSocket.OPEN) {
      onOpen();
    } else {
      this.ws.once("open", onOpen);
      this.ws.once("error", (err) => {
        console.error("GeminiLiveAudioClient failed to connect:", err);
        this.clearSetupTimeout();
        this.rejectReady?.(err);
      });
      this.ws.once("close", (code, reason) => {
        if (!this.setupComplete) {
          const reasonText = reason?.toString() || "no reason";
          const err = new Error(
            `GeminiLiveAudioClient closed before setupComplete (${code}) ${reasonText}`
          );
          this.clearSetupTimeout();
          this.rejectReady?.(err);
        }
      });
    }

    this.ws.on("error", (err) => {
      console.error("GeminiLiveAudioClient::WS error:", err);
      this.clearSetupTimeout();
    });
    this.ws.on("close", (code, reason) => {
      const reasonText = reason?.toString() || "no reason";
      console.log(`GeminiLiveAudioClient::WS close (${code}) ${reasonText}`);
      this.active = false;
      this.resolveStopped?.();
      if (this.currentTurnResolver) {
        this.currentTurnResolver();
        this.currentTurnResolver = null;
      }
    });

    this.ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (this.inboundLogCount < 1) {
          const keys = Object.keys(msg).join(", ") || "no keys";
          console.log(`GeminiLiveAudioClient::Inbound message keys: ${keys}`);
          this.inboundLogCount += 1;
        }

        if (msg.setupComplete && !this.setupComplete) {
          this.setupComplete = true;
          this.clearSetupTimeout();
          console.log("GeminiLiveAudioClient::setupComplete received");
          this.resolveReady?.();
        }
        if (msg.error) {
          const errorText =
            typeof msg.error === "string"
              ? msg.error
              : msg.error?.message ?? JSON.stringify(msg.error);
          const err = new Error(`GeminiLiveAudioClient server error: ${errorText}`);
          console.error(err.message);
          if (!this.setupComplete) {
            this.clearSetupTimeout();
            this.rejectReady?.(err);
          }
        }

        // Handle Audio
        if (msg.serverContent?.modelTurn?.parts) {
          let chunkCount = 0;
          let byteCount = 0;
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData?.data) {
              const buffer = Buffer.from(part.inlineData.data, "base64");
              chunkCount += 1;
              byteCount += buffer.length;
              onAudioChunk(buffer, this.activeStepId);
            }
          }
          if (chunkCount > 0) {
            console.log(
              `GeminiLiveAudioClient::Audio inlineData received: ${byteCount} bytes (${chunkCount} chunks)`
            );
          }
        }

        // Handle Turn Completion
        if (msg.turnComplete === true || msg.serverContent?.turnComplete === true) {
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
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Puck" },
            },
          },
        },
      },
    };
    this.ws.send(JSON.stringify(setup));
    console.log("GeminiLiveAudioClient::Setup sent");
  }

  async speakStep(stepId: string, text: string): Promise<void> {
    //TODO... This log occurs
    console.log(`GeminiLiveAudioClient::Preparing to speak step: ${stepId}`);

    try {
      const ready = await this.waitForReadyOrStopped();
      if (!ready) {
        return;
      }
      if (this.active === false) {
        console.warn(
          `speakStep[${stepId}] skipped: client is inactive/interrupted`
        );
        return;
      }

      return new Promise((resolve) => {
        this.activeStepId = stepId;
        this.currentTurnDidStart = false;

        this.currentTurnResolver = () => {
          if (this.currentTurnDidStart) {
            this.hooks.onStepEnd(stepId);
          }
          resolve();
        };

        this.hooks.onStepStart(stepId);
        this.currentTurnDidStart = true;
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
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true, // Tells Gemini to signal when finished
        },
      };
      this.ws.send(JSON.stringify(payload), (err) => {
        //TODO... None of these logs occur
        if (err) {
          console.error("Error sending text prompt:", err);
        } else {
          console.log("GeminiLiveAudioClient::Sent text prompt");
        }  
      });
    } catch (err) {
      console.error("Error sending text prompt:", err);
    }
  }

  // Critical: If we stop/interrupt, we must resolve any pending promises
  stop() {
    this.active = false;
    this.resolveStopped?.();
    if (this.currentTurnResolver) {
      this.currentTurnResolver();
      this.currentTurnResolver = null;
    }
  }

  resume() {
    this.active = true;
    this.stoppedPromise = new Promise((resolve) => {
      this.resolveStopped = resolve;
    });
  }

  close() {
    this.ws.close();
  }

  private async waitForReadyOrStopped(): Promise<boolean> {
    try {
      await Promise.race([this.readyPromise, this.stoppedPromise]);
    } catch (err) {
      console.error("GeminiLiveAudioClient readiness failed:", err);
      return false;
    }
    return this.active === true;
  }

  private clearSetupTimeout() {
    if (this.setupTimeout) {
      clearTimeout(this.setupTimeout);
      this.setupTimeout = null;
    }
  }
}
