import { useCallback, useRef, useState } from "react";
import { useDebugState } from "../state/debugState";
import type { EquationStep, ServerToClientMessage } from "@shared/types";
import { useTTS } from "../textToSpeech/useTTS";
import { useLiveAudio } from "../audio/useLiveAudio";
import { useWebSocketState } from "../state/weSocketState";

export function useLiveSession() {
  const sendTimeRef = useRef<number | null>(null);
  const { wsClientRef } = useWebSocketState();
  const { messages, streamingText, equationSteps } = useHandleMessage(sendTimeRef);

  function sendUserMessage(text: string) {
    sendTimeRef.current = Date.now();

    wsClientRef?.current?.send({
      type: "user_message",
      payload: { text },
    });
  }

  return {
    messages,
    streamingText,
    equationSteps,
    sendUserMessage,
  };
}

export function useHandleMessage(sendTimeRef?: React.RefObject<number | null>) {
  const [messages, setMessages] = useState<string[]>([]);
  const [equationSteps, setEquationSteps] = useState<EquationStep[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const { setState: setDebugState } = useDebugState();
  const bufferRef = useRef("");
  const { speak, interrupt: interruptTTS } = useTTS();
  const { playChunk } = useLiveAudio();




  const handleMessage = useCallback((message: ServerToClientMessage) => {
    const updateLatencyOnce = () => {
      setDebugState((s) => {
        if (s.lastLatencyMs != null) return s;
        return {
          ...s,
          lastLatencyMs: sendTimeRef?.current
            ? Date.now() - sendTimeRef.current
            : undefined,
        };
      });
    };

    updateLatencyOnce();
      
    if (message.type === "ai_interrupted") {
      interruptTTS();

      setDebugState((s) => ({
        ...s,
        interruptedCount: s.interruptedCount + 1,
      }));

      
    }

    if (message.type === "ai_audio_chunk") {
      playChunk(message.payload.audioBase64);
    }

    if (message.type === "equation_step") {
      setEquationSteps((s) => [...s, message.payload]);

      setDebugState((s) => ({
        ...s,
        lastEquationStep: message.payload,
      }));
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
        speak(finalText);
        
        setDebugState((s) => ({
          ...s,
          aiMessageCount: s.aiMessageCount + 1,
        }));
      }
    }

    if (message.type === "ai_message") {
      setMessages((prev) => [...prev, message.payload.text]);
      speak(message.payload.text);

      setDebugState((s) => ({
        ...s,
        aiMessageCount: s.aiMessageCount + 1,
      }));
    }
  }, [interruptTTS, playChunk, sendTimeRef, setDebugState, speak]);


  return {
    messages,
    streamingText,
    equationSteps,
    handleMessage,
  };
}
