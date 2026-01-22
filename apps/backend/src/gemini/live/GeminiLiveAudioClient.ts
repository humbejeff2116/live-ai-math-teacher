// GeminiLiveAudioClient.ts
import WebSocket from "ws";
import { env } from "../../config/env.js";

type StepAudioHooks = {
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
  if (!url.searchParams.has("key")) url.searchParams.set("key", apiKey);
  return url.toString();
}

export class GeminiLiveAudioClient {
  private ws: WebSocket | null = null;

  private active = true;

  private readyPromise: Promise<void>;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((err: Error) => void) | null = null;

  private stoppedPromise: Promise<void>;
  private resolveStopped: (() => void) | null = null;

  private setupTimeout: NodeJS.Timeout | null = null;
  private setupComplete = false;
  private inboundLogCount = 0;

  private activeStepId: string | null = null;

  private currentTurnResolver: (() => void) | null = null;
  private currentTurnDidStart = false;

  private connecting = false;

  constructor(
    private onAudioChunk: (
      chunk: Buffer,
      stepId: string | null,
      mimeType?: string,
    ) => void,
    private hooks: StepAudioHooks,
  ) {
    this.readyPromise = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    this.stoppedPromise = new Promise((resolve) => {
      this.resolveStopped = resolve;
    });

    // Initial connect
    void this.connect();
  }

  // ---- NEW: connect/reconnect ----
  private async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;

    // reset setup state + ready promise
    this.setupComplete = false;
    this.inboundLogCount = 0;

    this.readyPromise = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    const url = buildLiveWsUrl(env.gemini.liveWsUrl, env.gemini.apiKey);
    this.ws = new WebSocket(url);

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

    this.ws.once("open", onOpen);

    this.ws.once("error", (err) => {
      console.error("GeminiLiveAudioClient failed to connect:", err);
      this.clearSetupTimeout();
      this.rejectReady?.(err);
    });

    this.ws.on("close", (code, reason) => {
      const reasonText = reason?.toString() || "no reason";
      console.log(`GeminiLiveAudioClient::WS close (${code}) ${reasonText}`);

      // Mark inactive connection, but keep client "active" concept separate
      this.clearSetupTimeout();

      // resolve any pending turn to avoid deadlocks
      if (this.currentTurnResolver) {
        this.currentTurnResolver();
        this.currentTurnResolver = null;
      }

      // Resolve stopped so waiters can exit, but we will reconnect on demand
      this.resolveStopped?.();

      // Important: don't keep a dead socket
      this.ws = null;
      this.connecting = false;
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
              : (msg.error?.message ?? JSON.stringify(msg.error));
          console.error(`GeminiLiveAudioClient server error: ${errorText}`);
        }

        // Audio
        if (msg.serverContent?.modelTurn?.parts) {
          let chunkCount = 0;
          let byteCount = 0;
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData?.data) {
              const buffer = Buffer.from(part.inlineData.data, "base64");
              const mimeType = part.inlineData.mimeType;
              chunkCount += 1;
              byteCount += buffer.length;
              this.onAudioChunk(buffer, this.activeStepId, mimeType);
            }
          }
          if (chunkCount > 0) {
            console.log(
              `GeminiLiveAudioClient::Audio inlineData received: ${byteCount} bytes (${chunkCount} chunks)`,
            );
          }
        }

        // Turn completion
        if (
          msg.turnComplete === true ||
          msg.serverContent?.turnComplete === true
        ) {
          console.log(
            "GeminiLiveAudioClient::Turn Complete for step:",
            this.activeStepId,
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

    this.connecting = false;
  }

  private sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setup = {
      setup: {
        model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
        },
      },
    };

    this.ws.send(JSON.stringify(setup));
    console.log("GeminiLiveAudioClient::Setup sent");
  }

  // ---- NEW: ensureConnected ----
  private async ensureConnected(): Promise<boolean> {
    if (!this.active) return false;

    // If socket missing or not open, reconnect
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // If connect didn't yield an open socket, fail safely
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;

    // Wait for setupComplete (or stopped)
    return await this.waitForReadyOrStopped();
  }

  async speakStep(stepId: string, text: string): Promise<void> {
    console.log(`GeminiLiveAudioClient::Preparing to speak step: ${stepId}`);

    const ready = await this.ensureConnected();
    if (!ready) {
      console.warn(`speakStep[${stepId}] skipped: not ready/active`);
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

      console.log("GeminiLiveAudioClient::ws state", this.ws?.readyState);
      // IMPORTANT: only start the step AFTER we successfully send the prompt
      const sent = this.sendTextPrompt(text);
      if (!sent) {
        this.currentTurnResolver?.();
        this.currentTurnResolver = null;
        return;
      }

      this.hooks.onStepStart(stepId);
      this.currentTurnDidStart = true;
    });
  }

  private sendTextPrompt(text: string): boolean {
    if (!this.ws || !this.active || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        "GeminiLiveAudioClient::sendTextPrompt skipped (ws not open/active=false)",
      );
      return false;
    }

    try {
      const payload = {
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true,
        },
      };

      this.ws.send(JSON.stringify(payload), (err) => {
        if (err) console.error("Error sending text prompt:", err);
        else console.log("GeminiLiveAudioClient::Sent text prompt");
      });

      return true;
    } catch (err) {
      console.error("Error sending text prompt:", err);
      return false;
    }
  }

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
    try {
      this.ws?.close();
    } catch {}
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
