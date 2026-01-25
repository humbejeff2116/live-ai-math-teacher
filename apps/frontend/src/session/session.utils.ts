import type { ConfusionReason, ConfusionSeverity } from "@shared/types";

export function classifyConfusion(text: string): {
  reason: ConfusionReason;
  severity: ConfusionSeverity;
} {
  const t = text.toLowerCase();
  if (t.includes("again") || t.includes("repeat"))
    return { reason: "repeat_request", severity: "low" };
  if (t.includes("wrong") || t.includes("not correct"))
    return { reason: "wrong_answer", severity: "medium" };
  if (
    t.includes("lost") ||
    t.includes("don't understand") ||
    t.includes("dont understand")
  )
    return { reason: "general", severity: "high" };
  if (
    t.includes("um") ||
    t.includes("uh") ||
    t.includes("wait") ||
    t.includes("hold on")
  )
    return { reason: "hesitation", severity: "low" };
  return { reason: "general", severity: "medium" };
}
