import { VisualHintOverlayV1, VisualHintRequestV1 } from "@shared/types";

export function extractJson(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
}

export function buildMockOverlay(request: VisualHintRequestV1): VisualHintOverlayV1 {
  return {
    version: "visual_hint_overlay_v1",
    requestId: request.requestId,
    intent: { type: "focus-area", confidence: 0.4 },
    overlays: [
      {
        kind: "circle",
        target: { kind: "side", side: "lhs" },
        color: "#f97316",
        opacity: 0.9,
        thicknessPx: 2,
      },
      {
        kind: "text",
        target: { kind: "side", side: "lhs" },
        text: "Notice the extra term",
        anchor: { xPct: 0.28, yPct: 0.2 },
      },
    ],
    ui: {
      title: "Visual hint",
      subtitle: "Focus on what doesn't belong yet.",
    },
    policy: {
      gaveAnswer: false,
      revealedNextStep: false,
      containsNumericSolution: false,
    },
  };
}
