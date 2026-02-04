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

export function countSamplesFromBase64(base64Str: string): number {
  // 1. Remove header if present (data:audio/pcm;base64,...)
  const cleanStr = base64Str.split(",").pop() || "";

  // 2. Calculate buffer length in bytes
  // specific logic: 4 chars = 3 bytes
  const byteLength =
    cleanStr.length * (3 / 4) -
    (cleanStr.endsWith("==") ? 2 : cleanStr.endsWith("=") ? 1 : 0);

  // 3. Convert bytes to samples (Assuming 16-bit PCM = 2 bytes per sample)
  // If your audio is Float32, change '2' to '4'. Most AI text-to-speech is 16-bit Int.
  return Math.floor(byteLength / 2);
}
