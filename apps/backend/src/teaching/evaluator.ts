export function extractNumber(input: string): number | null {
  const match = input.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function evaluateAnswer(transcript: string, expected: number): boolean {
  const value = extractNumber(transcript);
  if (value === null) return false;
  return value === expected;
}
