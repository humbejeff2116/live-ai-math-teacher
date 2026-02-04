import { z } from "zod";
import type { VisualHintOverlayV1 } from "@shared/types";

const targetRefSchema = z.union([
  z.object({
    kind: z.literal("token"),
    token: z.string().min(1),
    occurrence: z.number().int().positive().optional(),
  }),
  z.object({
    kind: z.literal("side"),
    side: z.enum(["lhs", "rhs"]),
  }),
  z.object({
    kind: z.literal("equals"),
  }),
  z.object({
    kind: z.literal("bbox_px"),
    x: z.number().finite(),
    y: z.number().finite(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
]);

const overlayBaseSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["bbox", "underline", "circle", "brace"]),
  target: targetRefSchema,
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  thicknessPx: z.number().positive().optional(),
});

const overlayArrowSchema = z.object({
  id: z.string().optional(),
  kind: z.literal("arrow"),
  from: targetRefSchema,
  to: targetRefSchema,
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  thicknessPx: z.number().positive().optional(),
  label: z.string().optional(),
});

const overlayTextSchema = z.object({
  id: z.string().optional(),
  kind: z.literal("text"),
  target: targetRefSchema,
  text: z.string().min(1),
  color: z.string().optional(),
  anchor: z
    .object({
      xPct: z.number().min(0).max(1),
      yPct: z.number().min(0).max(1),
    })
    .optional(),
});

const overlaySchema = z.union([
  overlayBaseSchema,
  overlayArrowSchema,
  overlayTextSchema,
]);

const overlayV1Schema = z.object({
  version: z.literal("visual_hint_overlay_v1"),
  requestId: z.string().min(1),
  intent: z.object({
    type: z.string().min(1),
    confidence: z.number().min(0).max(1),
  }),
  overlays: z.array(overlaySchema),
  ui: z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    suggestedAction: z.string().optional(),
  }),
  policy: z.object({
    gaveAnswer: z.literal(false),
    revealedNextStep: z.literal(false),
    containsNumericSolution: z.literal(false),
  }),
});

type ValidateConstraints = {
  maxOverlays: number;
  allowTextOverlays: boolean;
};

const spoilerRegexes: RegExp[] = [
  /\bx\s*=/i,
  /\banswer\b/i,
  /\bsolution\b/i,
  /=\s*[-+]?\d+(\.\d+)?/i,
];

function containsSpoilerText(text: string): boolean {
  return spoilerRegexes.some((re) => re.test(text));
}

function collectTextFields(overlay: VisualHintOverlayV1): string[] {
  const texts: string[] = [];
  if (overlay.ui.title) texts.push(overlay.ui.title);
  if (overlay.ui.subtitle) texts.push(overlay.ui.subtitle);
  if (overlay.ui.suggestedAction) texts.push(overlay.ui.suggestedAction);

  overlay.overlays.forEach((item) => {
    if ("text" in item && typeof item.text === "string") {
      texts.push(item.text);
    }
    if ("label" in item && typeof item.label === "string") {
      texts.push(item.label);
    }
  });

  return texts;
}

export function validateVisualHintOverlay(
  raw: unknown,
  constraints: ValidateConstraints,
): { ok: true; data: VisualHintOverlayV1 } | { ok: false; error: string } {
  const parsed = overlayV1Schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const overlay = parsed.data as VisualHintOverlayV1;

  if (overlay.overlays.length > constraints.maxOverlays) {
    return { ok: false, error: "Too many overlay items returned." };
  }

  if (!constraints.allowTextOverlays) {
    const hasText = overlay.overlays.some((item) => item.kind === "text");
    if (hasText) {
      return { ok: false, error: "Text overlays are not allowed." };
    }
  }

  const textFields = collectTextFields(overlay);
  const spoilerFound = textFields.find((text) => containsSpoilerText(text));
  if (spoilerFound) {
    return { ok: false, error: "Overlay text contains a spoiler." };
  }

  return { ok: true, data: overlay };
}
