const CONFUSION_PHRASES = [
  "i don't understand",
  "i dont get",
  "this is confusing",
  "i'm lost",
  "that doesn't make sense",
  "can you explain again",
  "what does that mean",
  "why did you do that",
  "i'm confused",
  // "how did you do that",
  // "when",
  // "where"
];

export function detectConfusion(text: string): boolean {
  const lower = text.toLowerCase();
  return CONFUSION_PHRASES.some((p) => lower.includes(p));
}
