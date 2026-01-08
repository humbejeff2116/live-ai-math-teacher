export async function sendInteraction(payload: {
  sessionId: string;
  transcript: string;
  silenceMs: number;
}) {
  const res = await fetch("/interaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Interaction failed");
  }

  return res.json();
}
