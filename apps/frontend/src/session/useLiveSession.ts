import { useCallback, useEffect, useRef, useState } from "react";
import { useDebugState } from "../state/debugState";
import type { EquationStep, ResumeFromStepSource, ServerToClientMessage } from "@shared/types";
import { useTTS } from "../textToSpeech/useTTS";
import { useLiveAudio } from "../audio/useLiveAudio";
import { useWebSocketState } from "../state/weSocketState";
import { useTeacherState } from "./useTeacherState";
import { AudioStepTimeline } from "../audio/audioStepTimeLine";

export function useLiveSession() {
  const sendTimeRef = useRef<number | null>(null);
  const { wsClientRef } = useWebSocketState();
  const lastStepIndexRef = useRef<number | null>(null);
  const stepTimelineRef = useRef(new AudioStepTimeline());

  const { messages, streamingText, equationSteps, teacherState, aiLifecycleTick } =
    useHandleMessage(stepTimelineRef, sendTimeRef, lastStepIndexRef);

  // 3. Cleanup logic: Stop audio/timers when the hook unmounts
  useEffect(() => {
    const timeline = stepTimelineRef.current;

    return () => {
      timeline.destroy?.();
      console.log("Live session cleaned up.");
    };
  }, []);

  function sendUserMessage(text: string) {
    sendTimeRef.current = Date.now();
    const lower = text.toLowerCase();

    if (
      lower.includes("confuse") ||
      lower.includes("don't understand") ||
      lower.includes("dont get") ||
      lower.includes("lost") ||
      lower.includes("doesn't make sense")
    ) {
      wsClientRef.current?.send({
        type: "confusion_signal",
        payload: { text, source: "text" },
      });
      return;
    }

    if (
      lower.includes("step") ||
      lower.includes("last") ||
      lower.includes("simplify") ||
      lower.includes("that equation")
    ) {
      wsClientRef.current?.send({
        type: "select_step_nl",
        payload: { text },
      });
      return;
    }

    wsClientRef.current?.send({
      type: "user_message",
      payload: { text },
    });
  }

  function handleStudentSpeechFinal(text: string) {
    wsClientRef.current?.send({
      type: "resume_request",
      payload: {
        studentUtterance: text,
        lastKnownStepIndex: lastStepIndexRef.current,
      },
    });
  }

  function reExplainStep(
    stepId: string,
    style: "simpler" | "visual" | "example" = "simpler"
  ) {
    wsClientRef.current?.send({
      type: "reexplain_step",
      payload: { stepId, style },
    });
  }

  function resumeFromStep(stepId: string) {
    wsClientRef.current?.send({
      type: "resume_from_step",
      payload: {
        stepId,
        source: "waveform" as ResumeFromStepSource,
      },
    });
  }
  

  return {
    messages,
    streamingText,
    equationSteps,
    sendUserMessage,
    handleStudentSpeechFinal,
    reExplainStep,
    teacherState,
    resumeFromStep,
    aiLifecycleTick,
    getStepTimeline: () => stepTimelineRef.current,
  };
}

export function useHandleMessage(
  stepTimelineRef: React.RefObject<AudioStepTimeline>,
  sendTimeRef: React.RefObject<number | null>,
  lastStepIndexRef: React.RefObject<number | null>
) {
  const [messages, setMessages] = useState<string[]>([]);
  const [equationSteps, setEquationSteps] = useState<EquationStep[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [aiLifecycleTick, setAiLifecycleTick] = useState(0);
  const { setState: setDebugState } = useDebugState();
  const bufferRef = useRef("");
  const { interrupt: interruptTTS } = useTTS();
  const { playChunk } = useLiveAudio();
  const [teacherState, dispatchTeacher] = useTeacherState();

  const handleMessage = useCallback(
    (message: ServerToClientMessage) => {
      const updateLatencyOnce = () => {
        setDebugState((s) => {
          if (s.lastLatencyMs != null) return s;
          return {
            ...s,
            lastLatencyMs: sendTimeRef.current
              ? Date.now() - sendTimeRef.current
              : undefined,
          };
        });
      };

      updateLatencyOnce();
      dispatchTeacher(message);

      if (message.type === "ai_reexplained") {
        setDebugState((s) => ({
          ...s,
          reexplainedStepIndex: message.payload.reexplainedStepIndex,
        }));
      }

      if (message.type === "ai_confusion_handled") {
        setDebugState((s) => ({
          ...s,
          confusionCount: (s.confusionCount ?? 0) + 1,
        }));
      }

      if (message.type === "step_audio_start") {
        stepTimelineRef.current.onStepStart(
          message.payload.stepId,
          message.payload.atMs
        );
      }

      if (message.type === "step_audio_end") {
        stepTimelineRef.current.onStepEnd(
          message.payload.stepId,
          message.payload.atMs
        );
      }

      if (message.type === "ai_resumed") {
        setStreamingText("");
        setAiLifecycleTick((t) => t + 1);
      }

      if (message.type === "equation_step") {
        lastStepIndexRef.current = message.payload.index;

        // TODO... fix bug
        //for some reason equationSteps state is an empty array,
        //even after this is called, and 
        setEquationSteps((s) => [...s, message.payload]);

        //TODO... but the last equation step here is been saved in setDebugState
        setDebugState((s) => ({
          ...s,
          lastEquationStep: message.payload,
        }));
      }

      if (message.type === "ai_interrupted") {
        interruptTTS();
        setAiLifecycleTick((t) => t + 1);

        setDebugState((s) => ({
          ...s,
          interruptedCount: s.interruptedCount + 1,
        }));
      }

      if (message.type === "ai_audio_chunk") {
        playChunk(message.payload.audioBase64);
      }

      if (message.type === "ai_message_chunk") {
        if (!message.payload.isFinal) {
          bufferRef.current += message.payload.textDelta;
          setStreamingText(bufferRef.current);
        } else {
          // finalize
          const finalText = bufferRef.current;
          bufferRef.current = "";
          setStreamingText("");
          setMessages((prev) => [...prev, finalText]);
          // speak(finalText);

          setDebugState((s) => ({
            ...s,
            aiMessageCount: s.aiMessageCount + 1,
          }));
        }
      }

      if (message.type === "ai_message") {
        setMessages((prev) => [...prev, message.payload.text]);
        // speak(message.payload.text);

        setDebugState((s) => ({
          ...s,
          aiMessageCount: s.aiMessageCount + 1,
        }));
      }
    },
    [
      dispatchTeacher,
      lastStepIndexRef,
      setDebugState,
      sendTimeRef,
      stepTimelineRef,
      interruptTTS,
      playChunk,
    ]
  );

  return {
    messages,
    streamingText,
    equationSteps,
    handleMessage,
    teacherState,
    aiLifecycleTick,
  };
}
