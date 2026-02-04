import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { VisualHintOverlayV1, VisualHintRequestV1 } from "@shared/types";
import { useWebSocketState } from "@/state/weSocketState";
import { captureEquationImage } from "./captureEquationImage";
import { validateVisualHintOverlay } from "./visualHint.schema";

export type VisualHintStatus =
  | "idle"
  | "capturing"
  | "requesting"
  | "ready"
  | "error";

export type VisualHintCapture = {
  widthPx: number;
  heightPx: number;
};

type VisualHintRequestArgs = {
  stepId: string;
  uiIndex: number;
  equationText: string;
  explanationText?: string;
  student?: {
    lastUtterance?: string;
    confusionReason?:
      | "pause"
      | "hesitation"
      | "wrong_answer"
      | "repeat_request"
      | "general";
    confusionSeverity?: "low" | "medium" | "high";
  };
};

type UseVisualHintOverlayArgs = {
  equationNodeRef: RefObject<HTMLElement | null>;
  problemId: string;
  maxOverlays?: number;
  allowTextOverlays?: boolean;
};

export function useVisualHintOverlay({
  equationNodeRef,
  problemId,
  maxOverlays = 6,
  allowTextOverlays = true,
}: UseVisualHintOverlayArgs) {
  const { wsClientRef, subscribe } = useWebSocketState();
  const [status, setStatus] = useState<VisualHintStatus>("idle");
  const [overlay, setOverlay] = useState<VisualHintOverlayV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capture, setCapture] = useState<VisualHintCapture | null>(null);
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [overlayStepId, setOverlayStepId] = useState<string | null>(null);

  const pendingRequestRef = useRef<{
    requestId: string;
    stepId: string;
    constraints: { maxOverlays: number; allowTextOverlays: boolean };
  } | null>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
    setStatus("error");
  }, []);

  const requestHint = useCallback(
    async (args: VisualHintRequestArgs) => {
      const node = equationNodeRef.current;
      if (!node) {
        handleError("Equation is not ready for capture.");
        return;
      }
      if (!wsClientRef.current) {
        handleError("Not connected yet. Try again in a moment.");
        return;
      }

      if (
        pendingRequestRef.current?.stepId === args.stepId &&
        (status === "capturing" || status === "requesting")
      ) {
        return;
      }

      const requestId =
        pendingRequestRef.current?.stepId === args.stepId &&
        status !== "idle" &&
        status !== "error"
          ? pendingRequestRef.current.requestId
          : crypto.randomUUID();

      const constraints = { maxOverlays, allowTextOverlays };
      pendingRequestRef.current = {
        requestId,
        stepId: args.stepId,
        constraints,
      };

      setStatus("capturing");
      setOverlay(null);
      setOverlayStepId(args.stepId);
      setError(null);
      setCaptureDataUrl(null);

      const captureResult = await captureEquationImage(node);
      if (!captureResult) {
        handleError("Couldn't capture the equation. Try again.");
        return;
      }

      setCapture({
        widthPx: captureResult.widthPx,
        heightPx: captureResult.heightPx,
      });
      setCaptureDataUrl(`data:image/png;base64,${captureResult.base64Png}`);
      setStatus("requesting");

      const payload: VisualHintRequestV1 = {
        version: "visual_hint_request_v1",
        requestId,
        problemId,
        step: {
          stepId: args.stepId,
          uiIndex: args.uiIndex,
          equationText: args.equationText,
          explanationText: args.explanationText,
        },
        student: {
          lastUtterance: args.student?.lastUtterance,
          confusionReason: args.student?.confusionReason,
          confusionSeverity: args.student?.confusionSeverity,
        },
        render: {
          imagePngBase64: captureResult.base64Png,
          widthPx: captureResult.widthPx,
          heightPx: captureResult.heightPx,
        },
        constraints: {
          maxOverlays,
          allowTextOverlays,
          forbidGivingAnswer: true,
          forbidRevealingNextStep: true,
        },
      };

      wsClientRef.current?.send({
        type: "visual_hint_request",
        payload,
      });
    },
    [
      equationNodeRef,
      handleError,
      maxOverlays,
      allowTextOverlays,
      problemId,
      status,
      wsClientRef,
    ],
  );

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === "visual_hint_overlay") {
        const pending = pendingRequestRef.current;
        if (!pending || message.payload.requestId !== pending.requestId) return;

        const validation = validateVisualHintOverlay(
          message.payload.overlay,
          pending.constraints,
        );
        if (!validation.ok) {
          handleError(validation.error);
          return;
        }

        setOverlay(validation.data);
        setOverlayStepId(message.payload.stepId);
        setStatus("ready");
        return;
      }

      if (message.type === "visual_hint_error") {
        const pending = pendingRequestRef.current;
        if (!pending || message.payload.requestId !== pending.requestId) return;
        handleError(message.payload.message);
      }
    });

    return unsubscribe;
  }, [handleError, subscribe]);

  return {
    status,
    overlay,
    error,
    capture,
    captureDataUrl,
    overlayStepId,
    requestHint,
  };
}
