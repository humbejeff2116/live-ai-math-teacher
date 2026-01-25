import WebSocket from "ws";
import {
  ServerToClientMessage,
  TeacherSignal,
  TeacherState,
  EquationStep,
  ConfusionReason,
  ConfusionSeverity,
  ConfusionSource,
  ClientToServerMessage,
} from "@shared/types";
import { GeminiLiveAudioClient } from "./GeminiLiveAudioClient.js";
import { StreamingStepExtractor } from "../StreamingStepExtractor.js";
import { buildAdaptiveConfusionPrompt, buildConfusionNudgePrompt, buildFreshPrompt, buildResumePrompt, buildStepHintPrompt } from "../prompts/index.js";
// import { resolveConfusedStep, resolveStepFromText } from "../stepResolution/index.js";
import { GeminiLiveStreamingClient } from "../streaming/GeminiLiveStreamingClient.js";
import { GeminiStreamingClient } from "../streaming/GeminiStreamingClient.js";
import { AudioClock } from "./AudioClock.js";
import { StepAudioTracker } from "./StepAudioTracker.js";
import { randomUUID } from "node:crypto";
import { resolveConfusedStep } from "../stepResolution/confusionResolver.js";
import { resolveStepFromText } from "../stepResolution/stepIntentResolver.js";

const DEBUG_EQUATION_STEPS = true;
const MICRO_PAUSE_MS = 160;

type ResumeContext = {
  lastCompletedStep?: EquationStep;
  fullExplanationSoFar: string;
};

type ConfusionSignalPayload = Extract<
  ClientToServerMessage,
  { type: "confusion_signal" }
>["payload"];

type PendingConfusionOffer = {
  offerId: string;
  stepId: string;
  stepIndex: number;
  offeredAtMs: number;
  payload: ConfusionSignalPayload;
};

//TODO... 
//This is not used currently, but will be useful for future features.
function pickReexplainStyle(
  reason: ConfusionReason,
  severity: ConfusionSeverity,
) {
  // Map confusion -> explanation style
  if (reason === "wrong_answer") return "example" as const;
  if (reason === "repeat_request") return "simpler" as const;

  // pause/hesitation: prioritize slower + step-by-step language (we’ll do that in the prompt)
  if (reason === "pause" || reason === "hesitation") return "simpler" as const;

  // general confusion
  return severity === "high" ? ("visual" as const) : ("simpler" as const);
}

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

  private spokenStepIds = new Set<string>();
  private lastSentStepId: string | null = null;

  private pendingOffer: PendingConfusionOffer | null = null;

  private nudgeCooldownByStepId = new Map<string, number>();

  // Tunables
  private static readonly PENDING_OFFER_TTL_MS = 12_000; // offer expires if not acted on
  private static readonly DISMISS_COOLDOWN_MS = 25_000; // don't re-offer same step if dismissed
  private static readonly OFFER_REPEAT_GUARD_MS = 900; // your existing “same step pending” guard
  private static readonly CONFUSION_DEDUP_MS = 6_000; // ignore duplicate signals for the same pending step

  constructor(private ws: WebSocket) {
    this.streamingClient = new GeminiLiveStreamingClient();
    this.audioClient = new GeminiLiveAudioClient(
      (chunk, stepId, mimeType) => {
        try {
          this.ws.send(
            JSON.stringify({
              type: "ai_audio_chunk",
              payload: {
                audioBase64: chunk.toString("base64"),
                audioMimeType: mimeType ?? null,
                stepId: stepId, // Include stepId in the message to the client
              },
            }),
          );
        } catch (err) {
          console.error("Error sending audio chunk:", err);
        }
      },
      {
        // stepId: null,
        onStepStart: (stepId) => {
          console.log("GeminiLiveSession::onStepStart stepId:", stepId);
          if (!stepId) return;

          try {
            const atMs = this.audioClock.nowMs();
            this.stepAudioTracker.startStep(stepId);

            this.ws.send(
              JSON.stringify({
                type: "step_audio_start",
                payload: { stepId, atMs },
              }),
            );
          } catch (err) {
            console.error("Error sending step audio start:", err);
          }
        },
        onStepEnd: (stepId) => {
          console.log("GeminiLiveSession:onStepEnd stepId:", stepId);
          if (!stepId) return;
          try {
            const atMs = this.audioClock.nowMs();
            this.stepAudioTracker.endStep(stepId);

            this.ws.send(
              JSON.stringify({
                type: "step_audio_end",
                payload: { stepId, atMs },
              }),
            );
          } catch (err) {
            console.error("Error sending step audio end:", err);
          }
        },
      },
      (status, reason) => {
        this.send({
          type: "audio_status",
          payload: { status, reason, atMs: Date.now() },
        });
      },
    );
  }

  private send(msg: ServerToClientMessage) {
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }

  private async microPauseBeforeReexplain() {
    await new Promise((resolve) => setTimeout(resolve, MICRO_PAUSE_MS));
  }

  private setState(state: TeacherState, signal?: TeacherSignal) {
    this.teacherState = state;
    if (signal) this.send(signal);
  }

  async handleUserMessage(text: string, forceResumeMode = false) {
    try {
      if (this.pendingOffer) {
        const age = Date.now() - this.pendingOffer.offeredAtMs;
        if (age > GeminiLiveSession.PENDING_OFFER_TTL_MS) {
          this.pendingOffer = null;
        }
      }

      // If they typed something else, drop the pending offer
      this.pendingOffer = null;

      this.interrupt();
      this.setState("thinking", { type: "teacher_thinking" });

      const isContinuing =
        Boolean(this.resumeContext.lastCompletedStep) || forceResumeMode;

      let prompt: string;

      if (isContinuing && this.resumeContext.lastCompletedStep) {
        // Use the smart resume prompt with history
        console.log("handleUserMessage: building resume prompt");
        prompt = buildResumePrompt(
          text,
          this.resumeContext.lastCompletedStep,
          this.resumeContext.fullExplanationSoFar,
        );
      } else {
        // Only use fresh prompt if we have NO active problem context
        console.log("handleUserMessage: building fresh prompt");
        prompt = buildFreshPrompt(text);
      }

      await this.streamExplanation(prompt);
    } catch (err) {
      console.error("Error in handleUserMessage:", err);
    }
  }

  async resumeFromStep(stepId: string) {
    console.log("GeminiLiveSession::resumeFromStep: ", stepId);
    try {
      const step = this.stepExtractor.getSteps().find((s) => s.id === stepId);

      console.log("GeminiLiveSession::step: ", JSON.stringify(step));

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

      await this.microPauseBeforeReexplain();

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
    } catch (err) {
      console.error("Error in resumeFromStep:", err);
    }
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
    this.audioClient.haltPlayback();

    this.send({ type: "ai_interrupted" });
  }

  async resumeFromInterruption(args: {
    studentUtterance: string;
    clientStepIndex: number | null;
  }) {
    try {
      const resumeIndex =
        this.resumeContext.lastCompletedStep?.index ??
        args.clientStepIndex ??
        -1;

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
    } catch (err) {
      console.error("Error in resumeFromInterruption:", err);
    }
  }

  async reExplainStep(stepId: string, style = "simpler") {
    try {
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

      await this.microPauseBeforeReexplain();

      await this.streamExplanation(prompt, { audioMode: "step" });

      this.send({
        type: "ai_reexplained",
        payload: { reexplainedStepIndex: step.index },
      });
    } catch (err) {
      console.error("Error in reExplainStep:", err);
    }
  }

  async handleNaturalLanguageStepSelection(text: string) {
    try {
      const steps = this.stepExtractor.getSteps();
      const step = resolveStepFromText(text, steps);

      if (!step) {
        await this.handleUserMessage(
          "Which step would you like me to explain again?",
        );
        return;
      }

      await this.reExplainStep(step.id, "simpler");
    } catch (err) {
      console.error("Error in handleNaturalLanguageStepSelection:", err);
    }
  }

  // “yes/help/hint/explain” detector for voice/text
  private isAffirmativeHelp(text: string): boolean {
    const t = text.toLowerCase().trim();
    return (
      t === "yes" ||
      t.startsWith("yes ") ||
      t.includes("help") ||
      t.includes("hint") ||
      t.includes("explain") ||
      t.includes("re-explain") ||
      t.includes("again") ||
      t.includes("i'm stuck") ||
      t.includes("im stuck")
    );
  }

  // IMPORTANT: avoid “=” in nudge prompts, otherwise your step extractor will create fake steps.
  private stripEqualsLines(input: string): string {
    return input
      .split("\n")
      .filter((line) => !line.includes("="))
      .join("\n")
      .replace(/=/g, "") // last resort: remove stray equals
      .trim();
  }

  async handleConfusionSignal(payload: ConfusionSignalPayload) {
    console.log(
      "GeminiLiveSession::handleConfusionSignal called",
      JSON.stringify(payload, null, 2),
    );
    try {
      this.pruneCooldowns(Date.now());
      const steps = this.stepExtractor.getSteps();

      // 1) Prefer explicit hint from client
      let step =
        (payload.stepIdHint
          ? steps.find((s) => s.id === payload.stepIdHint)
          : null) ?? null;

      // 2) Otherwise fall back to resolver (uses currentSpokenStepId)
      if (!step) {
        step =
          resolveConfusedStep(
            payload.text ?? "",
            steps,
            this.currentSpokenStepId,
          ) ?? null;
      }

      // 3) Safe fallback
      if (!step) {
        await this.handleUserMessage(
          "No worries — tell me which step confused you (like 'step 2'), and I'll help.",
        );
        return;
      }

      const now = Date.now();

      // De-dup: if we already have a pending offer for this step, ignore repeats briefly.
      if (
        this.pendingOffer &&
        this.pendingOffer.stepId === step.id &&
        now - this.pendingOffer.offeredAtMs <
          GeminiLiveSession.CONFUSION_DEDUP_MS
      ) {
        return;
      }

      // if step is in cooldown, skip the “nudge offer” stage
      const cooldownUntil = this.nudgeCooldownByStepId.get(step.id) ?? 0;
      const inCooldown = now < cooldownUntil;

      const isPauseOrHesitation =
        payload.reason === "pause" || payload.reason === "hesitation";

      const shouldOfferFirst =
        isPauseOrHesitation && payload.severity !== "high" && !inCooldown;

      // ---- STAGE 1: Nudge first (human-like) ----
      if (shouldOfferFirst) {
        const sameStepPending = this.pendingOffer?.stepId === step.id;

        // If we already offered and we got another confusion signal on the same step soon,
        // then escalate to full re-explain.
        if (sameStepPending) {
          const elapsed = now - (this.pendingOffer?.offeredAtMs ?? 0);
          if (elapsed >= 900) {
            // escalate
            this.pendingOffer = null;
          } else {
            // too soon; ignore spam
            return;
          }
        } else {
          const offerId = randomUUID();
          // Offer help (don’t re-explain immediately)
          this.pendingOffer = {
            offerId,
            stepId: step.id,
            stepIndex: step.index,
            offeredAtMs: now,
            payload,
          };

          this.send({
            type: "confusion_nudge_offered",
            payload: {
              offerId,
              stepId: step.id,
              stepIndex: step.index,
              source: payload.source,
              reason: payload.reason,
              severity: payload.severity,
              atMs: Date.now(),
            },
          });

          // IMPORTANT: interrupt any current speech first
          this.interrupt();

          const prompt = buildConfusionNudgePrompt({
            stepNumber: step.index + 1,
            reason: payload.reason,
            severity: payload.severity,
            source: payload.source,
            studentText: payload.text,
            // Remove '=' so we don’t accidentally create a new equation step
            stepHintText: this.stripEqualsLines(step.text),
          });

          await this.streamExplanation(prompt, {
            audioMode: "freeform",
          });

          // NOTE: we intentionally do NOT send ai_confusion_handled here,
          // because we didn’t “handle” it yet — we only offered help.
          return;
        }
        // if we cleared pendingOffer above, we fall through to full re-explain
      }

      // ---- STAGE 2: Full adaptive re-explain ----
      this.pendingOffer = null;

      this.interrupt();

      this.setState("re-explaining", {
        type: "teacher_reexplaining",
        stepIndex: step.index,
      });

      await this.microPauseBeforeReexplain();

      const prompt = buildAdaptiveConfusionPrompt({
        stepText: step.text,
        stepEquation: step.equation,
        stepNumber: step.index + 1,
        reason: payload.reason,
        severity: payload.severity,
        source: payload.source,
        studentText: payload.text,
      });

      await this.streamExplanation(prompt);

      this.send({
        type: "ai_confusion_handled",
        payload: {
          confusionHandledStepIndex: step.index,
          source: payload.source,
          reason: payload.reason,
          severity: payload.severity,
          stepIdHint: payload.stepIdHint ?? null,
          atMs: Date.now(),
        },
      });
    } catch (err) {
      console.error("Error in handleConfusionSignal:", err);
    }
  }

  async handleConfusionHelpResponse(payload: {
    offerId: string;
    stepId: string;
    choice: "hint" | "explain";
    atMs: number;
  }) {
    // Must match current offer (prevents stale UI clicks)
    const offer = this.pendingOffer;
    if (!offer) return;
    if (offer.offerId !== payload.offerId) return;
    if (offer.stepId !== payload.stepId) return;

    // TTL safety (extra guard)
    const age = Date.now() - offer.offeredAtMs;
    if (age > GeminiLiveSession.PENDING_OFFER_TTL_MS) {
      this.pendingOffer = null;
      return;
    }

    // Resolve step from current extractor snapshot
    const steps = this.stepExtractor.getSteps();
    const step = steps.find((s) => s.id === offer.stepId) ?? null;

    // Clear pending offer no matter what
    this.pendingOffer = null;

    if (!step) {
      // fail safely: ask for which step
      await this.handleUserMessage("Which step should I help with?");
      return;
    }

    // Always interrupt before speaking
    this.interrupt();

    if (payload.choice === "hint") {
      const prompt = buildStepHintPrompt({
        stepNumber: step.index + 1,
        stepHintText: this.stripEqualsLines(step.text),
        reason: offer.payload.reason,
        severity: offer.payload.severity,
        source: offer.payload.source,
        studentText: offer.payload.text,
      });

      await this.streamExplanation(prompt, { audioMode: "freeform" });
      return;
    }

    // choice === "explain" => escalate to full adaptive re-explain
    await this.handleConfusionSignal({
      ...offer.payload,
      // ensure we target the right step
      stepIdHint: step.id,
      // if it was "low" from pause/hesitation, bump a bit so prompt takes it seriously
      severity:
        offer.payload.severity === "low" ? "medium" : offer.payload.severity,
    });
  }

  dismissConfusionNudge(payload: { stepId: string; atMs: number }) {
    // Only clear if it matches current offer
    if (this.pendingOffer?.stepId === payload.stepId) {
      this.pendingOffer = null;
    }

    // don’t re-offer for this step for a while
    this.nudgeCooldownByStepId.set(
      payload.stepId,
      Date.now() + GeminiLiveSession.DISMISS_COOLDOWN_MS,
    );
  }

  private pruneCooldowns(now: number) {
    for (const [k, until] of this.nudgeCooldownByStepId) {
      if (until <= now) this.nudgeCooldownByStepId.delete(k);
    }
  }

  hasResumeContext() {
    return Boolean(this.resumeContext.lastCompletedStep);
  }

  close() {
    this.interrupt();
    this.audioClient.close();
  }

  resetProblem() {
    this.stepExtractor.reset();
    this.resumeContext = {
      lastCompletedStep: undefined,
      fullExplanationSoFar: "",
    };
  }

  private async streamExplanation(
    prompt: string,
    opts?: { audioMode?: "step" | "freeform"; emitTeacherExplaining?: boolean },
  ) {
    try {
      this.abortController = new AbortController();
      this.aborted = false;
      this.isSpeaking = true;
      this.spokenStepIds.clear();
      this.lastSentStepId = null;
      // FIX 2: Re-enable audio if it was stopped by interrupt
      this.audioClient.resume();
      void this.audioClient.prewarm();
      let freeformFinal = "";

      const stream = await this.streamingClient.streamText(prompt, {
        signal: this.abortController.signal,
      });

      let started = false;

      console.log("streamExplanation: started streaming explanation");

      try {
        for await (const chunk of stream) {
          if (this.aborted || !chunk.text) break;

          console.log("chunk", chunk);

          if (!started) {
            started = true;
            if (opts?.emitTeacherExplaining !== false) {
              this.setState("explaining", {
                type: "teacher_explaining",
                stepIndex: this.resumeContext.lastCompletedStep?.index,
              });
            }
            // Optional: Add a separator in history for readability
            this.resumeContext.fullExplanationSoFar += "\n\n[Teacher]: ";
          }

          this.resumeContext.fullExplanationSoFar += chunk.text;

          this.send({
            type: "ai_message_chunk",
            payload: { textDelta: chunk.text, isFinal: false },
          });

          if (opts?.audioMode === "freeform") {
            freeformFinal += chunk.text;
            // IMPORTANT: do NOT run stepExtractor for freeform mode
            continue;
          }

          const step = this.stepExtractor.pushText(chunk.text);

          if (step) {
            // Dedupe: only handle each stepId once per stream
            if (this.spokenStepIds.has(step.id)) continue;

            this.spokenStepIds.add(step.id);

            this.resumeContext.lastCompletedStep = step;
            this.currentSpokenStepId = step.id;

            // Also guard duplicate sends (optional but helpful)
            if (this.lastSentStepId !== step.id) {
              this.lastSentStepId = step.id;

              if (DEBUG_EQUATION_STEPS) {
                console.log("[equation_step send]", {
                  id: step.id,
                  index: step.index,
                  equation: step.equation,
                });
              }
              this.send({ type: "equation_step", payload: step });
            }

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

        if (!this.aborted && opts?.audioMode === "freeform") {
          const spoken = freeformFinal.trim();
          if (spoken) {
            await this.audioClient.speakFreeform(spoken);
          }
        }

        if (!this.aborted) {
          this.setState("waiting", { type: "teacher_waiting" });
        }
      }
    } catch (err) {
      console.error("Error in streamExplanation:", err);
    }
  }
}

