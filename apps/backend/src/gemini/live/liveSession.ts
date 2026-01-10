import { WebSocket } from "ws";
import { GeminiLiveClient } from "./liveClient";
import { StreamingStepExtractor } from "../stepExtractor";
import { EquationStep, ServerToClientMessage } from "@shared/types";
import { GeminiLiveAudioClient } from "./liveAudioClient";
import { buildFreshPrompt, buildResumePrompt } from "./promptBuilder";

type ResumeContext = {
  lastCompletedStep?: EquationStep;
  partialSentence?: string;
  fullExplanationSoFar: string;
};

export class GeminiLiveSession {
  private client = new GeminiLiveClient();
  private stepExtractor = new StreamingStepExtractor();
  private audioClient: GeminiLiveAudioClient;
  private abortController: AbortController | null = null;
  private isSpeaking = false;
  private resumeContext: ResumeContext = {
    fullExplanationSoFar: "",
  };

  constructor(private ws: WebSocket) {
    this.audioClient = new GeminiLiveAudioClient((chunk) => {
      if (!this.isSpeaking) return;

      this.ws.send(
        JSON.stringify({
          type: "ai_audio_chunk",
          payload: {
            audioBase64: chunk.toString("base64"),
          },
        })
      );
    });
  }

  async handleUserMessage(text: string, resume = false) {
    // Cancel any previous turn
    this.interrupt();

    this.abortController = new AbortController();
    this.isSpeaking = true;

    const prompt = resume
      ? this.buildResumePrompt(text)
      : this.buildFreshPrompt(text);

    const stream = this.client.streamGenerate({
      model: "gemini-2.0-flash",
      input: prompt,
      signal: this.abortController?.signal,
    });

    try {
      for await (const chunk of stream) {
        if (!this.isSpeaking) return;
        if (!chunk.text) continue;

        this.resumeContext.fullExplanationSoFar += chunk.text;

        // 1) Stream raw text
        this.ws.send(
          JSON.stringify({
            type: "ai_message_chunk",
            payload: {
              textDelta: chunk.text,
              isFinal: false,
            },
          } as ServerToClientMessage)
        );

        // 2) Attempt step extraction
        const step = this.stepExtractor.pushText(chunk.text);
        if (step) {
          this.resumeContext.lastCompletedStep = step;

          this.ws.send(
            JSON.stringify({
              type: "equation_step",
              payload: step,
            })
          );
        }
      }
    } catch (err) {
      if ((err as any).name !== "AbortError") {
        console.error("Gemini stream error", err);
      }
    } finally {
      this.isSpeaking = false;
    }

    // Final signal
    this.ws.send(
      JSON.stringify({
        type: "ai_message_chunk",
        payload: {
          textDelta: "",
          isFinal: true,
        },
      })
    );

    // Optional: send full message for logs
    this.ws.send(
      JSON.stringify({
        type: "ai_message",
        payload: { text: this.resumeContext.fullExplanationSoFar },
      })
    );

    // send text to Gemini Live Audio
    this.audioClient.sendTextPrompt(this.resumeContext.fullExplanationSoFar);
  }

  private buildFreshPrompt(input: string) {
    return buildFreshPrompt(input);
  }

  private buildResumePrompt(input: string) {
    return buildResumePrompt(input, this.resumeContext.lastCompletedStep);
  }

  public hasResumeContext() {
    return Boolean(this.resumeContext.lastCompletedStep);
  }

  interrupt() {
    this.abortController?.abort();
    this.abortController = null;
    this.isSpeaking = false;
    this.audioClient.stop();
    this.stepExtractor.reset();

    this.ws.send(
      JSON.stringify({
        type: "ai_interrupted",
      })
    );
  }

  // Call this when:User explicitly asks a new question or session restarts
  resetSession() {
    this.resumeContext = { fullExplanationSoFar: "" };
    this.stepExtractor.reset();
  }

  close() {
    this.interrupt();
    this.audioClient.close();
  }
}
