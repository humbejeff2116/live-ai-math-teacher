const isDev = import.meta.env.MODE !== "production";

let sessionStartMs: number | null = null;

function formatValue(value: unknown) {
  if (value == null) return "null";
  if (typeof value === "number") {
    return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function logEvent(
  name: string,
  data?: Record<string, unknown> | string,
) {
  if (!isDev) return;

  const now = performance.now();
  if (sessionStartMs == null) sessionStartMs = now;
  const deltaSec = (now - sessionStartMs) / 1000;

  let suffix = "";
  if (data != null) {
    if (typeof data === "string") {
      suffix = ` ${data}`;
    } else {
      const pairs = Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${formatValue(value)}`);
      suffix = pairs.length ? ` ${pairs.join(" ")}` : "";
    }
  }

  console.log(`[+${deltaSec.toFixed(3)}s] ${name}${suffix}`);
}
