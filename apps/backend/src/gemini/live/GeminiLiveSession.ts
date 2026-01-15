import WebSocket from "ws";
import {
  ServerToClientMessage,
  TeacherSignal,
  TeacherState,
  EquationStep,
} from "@shared/types";
import { GeminiLiveAudioClient } from "./GeminiLiveAudioClient";
import { StreamingStepExtractor } from "../StreamingStepExtractor";
import { buildFreshPrompt, buildResumePrompt } from "../prompts";
import { resolveConfusedStep, resolveStepFromText } from "../stepResolution";
import { GeminiLiveStreamingClient } from "../streaming/GeminiLiveStreamingClient";
import { GeminiStreamingClient } from "../streaming/GeminiStreamingClient";
import { AudioClock } from "./AudioClock";
import { StepAudioTracker } from "./StepAudioTracker";

type ResumeContext = {
  lastCompletedStep?: EquationStep;
  fullExplanationSoFar: string;
};

export class GeminiLiveSession {
  private streamingClient: GeminiStreamingClient;
  private stepExtractor = new StreamingStepExtractor();
  private audioClient: GeminiLiveAudioClient;

  private abortController: AbortController | null = null;
  private isSpeaking = false;
  private aborted = false;

  private teacherState: TeacherState = "idle";
  private currentSpokenStepId: string | null = null;

  private resumeContext: ResumeContext = {
    fullExplanationSoFar: "",
  };

  private audioClock = new AudioClock();
  private stepAudioTracker = new StepAudioTracker(this.audioClock);

  constructor(private ws: WebSocket) {
    this.streamingClient = new GeminiLiveStreamingClient();
    this.audioClient = new GeminiLiveAudioClient(
      (chunk) => {
        this.ws.send(
          JSON.stringify({
            type: "ai_audio_chunk",
            payload: {
              audioBase64: chunk.toString("base64"),
            },
          })
        );
      },
      {
        onStepStart: (stepId) => {
          const atMs = this.audioClock.nowMs();
          this.stepAudioTracker.startStep(stepId);

          this.ws.send(
            JSON.stringify({
              type: "step_audio_start",
              payload: { stepId, atMs },
            })
          );
        },
        onStepEnd: (stepId) => {
          const atMs = this.audioClock.nowMs();
          this.stepAudioTracker.endStep(stepId);

          this.ws.send(
            JSON.stringify({
              type: "step_audio_end",
              payload: { stepId, atMs },
            })
          );
        },
      }
    );
  }

  private send(msg: ServerToClientMessage) {
    this.ws.send(JSON.stringify(msg));
  }

  private setState(state: TeacherState, signal?: TeacherSignal) {
    this.teacherState = state;
    if (signal) this.send(signal);
  }

  async handleUserMessage(text: string, resume = false) {
    this.interrupt();

    this.setState("thinking", { type: "teacher_thinking" });

    const prompt = resume
      ? buildResumePrompt(text, this.resumeContext.lastCompletedStep)
      : buildFreshPrompt(text);

    await this.streamExplanation(prompt);
  }

  async resumeFromStep(stepId: string) {
    const step = this.stepExtractor.getSteps().find((s) => s.id === stepId);

    if (!step) {
      // Fail safely: ask student what they want
      await this.handleUserMessage("Which step should I continue from?");
      return;
    }

    this.interrupt();

    this.setState("re-explaining", {
      type: "teacher_reexplaining",
      stepIndex: step.index,
    });

      const prompt = `
      You are a patient math teacher.

      The student clicked an earlier point in your explanation.
      Re-explain starting from this step ONLY, then continue to the next step.
      Do NOT restart from the beginning.

      Step ${step.index + 1}:
      ${step.text}

      Equation:
      ${step.equation}

      Continue from here.
      `.trim();

    await this.streamExplanation(prompt);
  }

  interrupt() {
    if (this.teacherState === "explaining") {
      this.setState("interrupted", {
        type: "teacher_interrupted",
        lastCompletedStepIndex:
          this.resumeContext.lastCompletedStep?.index ?? null,
      });
    }

    this.abortController?.abort();
    this.abortController = null;
    this.aborted = true;
    this.isSpeaking = false;
    this.stepAudioTracker.interrupt();
    this.audioClock.reset();
    this.audioClient.stop();

    this.send({ type: "ai_interrupted" });
  }

  async resumeFromInterruption(args: {
    studentUtterance: string;
    clientStepIndex: number | null;
  }) {
    const resumeIndex =
      this.resumeContext.lastCompletedStep?.index ?? args.clientStepIndex ?? -1;

    this.send({
      type: "ai_resumed",
      payload: { resumeFromStepIndex: resumeIndex },
    });

    const prompt = `
    You are a real-time math tutor.

    Last completed step index: ${resumeIndex}

    Resume from the NEXT step only.
    Do not repeat earlier steps.

    Student said:
    "${args.studentUtterance}"
    `.trim();

    await this.streamExplanation(prompt);
  }

  async reExplainStep(stepId: string, style = "simpler") {
    const step = this.resumeContext.lastCompletedStep;
    if (!step || step.id !== stepId) return;

    this.interrupt();

    const prompt = `
    Re-explain ONLY this step.
    Style: ${style}

    ${step.text}
    Equation: ${step.equation}
    `.trim();

    this.setState("re-explaining", {
      type: "teacher_reexplaining",
      stepIndex: step.index,
    });

    await this.streamExplanation(prompt);

    this.send({
      type: "ai_reexplained",
      payload: { reexplainedStepIndex: step.index },
    });
  }

  async handleNaturalLanguageStepSelection(text: string) {
    const steps = this.stepExtractor.getSteps();
    const step = resolveStepFromText(text, steps);

    if (!step) {
      await this.handleUserMessage(
        "Which step would you like me to explain again?"
      );
      return;
    }

    await this.reExplainStep(step.id, "simpler");
  }

  async handleConfusion(text: string) {
    const steps = this.stepExtractor.getSteps();
    const step = resolveConfusedStep(text, steps, this.currentSpokenStepId);

    if (!step) {
      await this.handleUserMessage(
        "I can slow down or explain a step again — which part is confusing?"
      );
      return;
    }

    await this.reExplainStep(step.id, "simpler");

    this.send({
      type: "ai_confusion_handled",
      payload: { confusionHandledStepIndex: step.index },
    });
  }

  hasResumeContext() {
    return Boolean(this.resumeContext.lastCompletedStep);
  }

  close() {
    this.interrupt();
    this.audioClient.close();
  }

  private async streamExplanation(prompt: string) {
    this.abortController = new AbortController();
    this.aborted = false;
    this.isSpeaking = true;
    this.stepExtractor.reset();
    this.resumeContext.fullExplanationSoFar = "";

    const stream = this.streamingClient.streamText(prompt, {
      signal: this.abortController.signal,
    });

    let started = false;

    try {
      for await (const chunk of stream) {
        if (this.aborted || !chunk.text) break;

        if (!started) {
          started = true;
          this.setState("explaining", {
            type: "teacher_explaining",
            stepIndex: this.resumeContext.lastCompletedStep?.index,
          });
        }

        this.resumeContext.fullExplanationSoFar += chunk.text;

        this.send({
          type: "ai_message_chunk",
          payload: { textDelta: chunk.text, isFinal: false },
        });

        const step = this.stepExtractor.pushText(chunk.text);

        if (step) {
          this.resumeContext.lastCompletedStep = step;
          this.currentSpokenStepId = step.id;

          this.send({ type: "equation_step", payload: step });
          // 🔊 Step-aware audio
          await this.audioClient.speakStep(step.id, step.text);
        }
      }
    } finally {
      this.isSpeaking = false;

      this.send({
        type: "ai_message_chunk",
        payload: { textDelta: "", isFinal: true },
      });

      this.send({
        type: "ai_message",
        payload: { text: this.resumeContext.fullExplanationSoFar },
      });

      if (!this.aborted) {
        this.setState("waiting", { type: "teacher_waiting" });
      }
    }
  }
}