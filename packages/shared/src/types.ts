
export type EquationStep = {
  id: string;
  /** Monotonic index within the solution */
  index: number;
  /** Classification of the step */
  type: "setup" | "transform" | "simplify" | "result";
  /** Human explanation (stream-safe) */
  text: string;
  /** Canonical equation form */
  equation: string;
};

export type StepAudioRange = {
  stepId: string;
  startMs: number;
  endMs?: number;
};

export type ReexplanStyle = "simpler" | "visual" | "example";

export type VisualHintTargetRef =
  | { kind: "token"; token: string; occurrence?: number }
  | { kind: "side"; side: "lhs" | "rhs" }
  | { kind: "equals" }
  | { kind: "bbox_px"; x: number; y: number; w: number; h: number };

export type VisualHintOverlayBase = {
  id?: string;
  kind: "bbox" | "underline" | "circle" | "brace";
  target: VisualHintTargetRef;
  color?: string;
  opacity?: number;
  thicknessPx?: number;
};

export type VisualHintOverlayArrow = {
  id?: string;
  kind: "arrow";
  from: VisualHintTargetRef;
  to: VisualHintTargetRef;
  color?: string;
  opacity?: number;
  thicknessPx?: number;
  label?: string;
};

export type VisualHintOverlayText = {
  id?: string;
  kind: "text";
  target: VisualHintTargetRef;
  text: string;
  color?: string;
  anchor?: {
    xPct: number;
    yPct: number;
  };
};

export type VisualHintOverlay = {
  id?: string;
  kind: "bbox" | "underline" | "circle" | "brace";
  target: VisualHintTargetRef;
  color?: string;
  opacity?: number;
  thicknessPx?: number;
} | VisualHintOverlayArrow | VisualHintOverlayText;

export type VisualHintOverlayV1 = {
  version: "visual_hint_overlay_v1";
  requestId: string;
  intent: {
    type: string;
    confidence: number;
  };
  overlays: VisualHintOverlay[];
  ui: {
    title: string;
    subtitle?: string;
    suggestedAction?: string;
  };
  policy: {
    gaveAnswer: false;
    revealedNextStep: false;
    containsNumericSolution: false;
  };
};

export type VisualHintRequestV1 = {
  version: "visual_hint_request_v1";
  requestId: string;
  problemId: string;
  step: {
    stepId: string;
    uiIndex: number;
    equationText: string;
    explanationText?: string;
  };
  student: {
    lastUtterance?: string;
    confusionReason?:
      | "pause"
      | "hesitation"
      | "wrong_answer"
      | "repeat_request"
      | "general";
    confusionSeverity?: "low" | "medium" | "high";
  };
  render: {
    imagePngBase64: string;
    widthPx: number;
    heightPx: number;
    tokenMap?: Array<{
      token: string;
      x: number;
      y: number;
      w: number;
      h: number;
      occurrence?: number;
    }>;
  };
  constraints: {
    maxOverlays: number;
    allowTextOverlays: boolean;
    forbidGivingAnswer: true;
    forbidRevealingNextStep: true;
  };
};
