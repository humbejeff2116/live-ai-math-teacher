function getEnvWsBaseUrl(): string | null {
  // If you set VITE_WS_URL, use it (best for split hosting)
  const raw = import.meta.env.VITE_WS_URL as string | undefined;
  if (!raw) return null;
  return raw.replace(/\/+$/, ""); // trim trailing slashes
}

export function buildWsUrl(): string {
  const fromEnv = getEnvWsBaseUrl();
  if (fromEnv) {
    // Allow either full ws(s) URL or http(s) URL
    if (fromEnv.startsWith("ws://") || fromEnv.startsWith("wss://")) {
      return `${fromEnv}/ws`;
    }
    if (fromEnv.startsWith("http://") || fromEnv.startsWith("https://")) {
      const wsProto = fromEnv.startsWith("https://") ? "wss://" : "ws://";
      const host = fromEnv.replace(/^https?:\/\//, "");
      return `${wsProto}${host}/ws`;
    }
    // If someone puts just host:port
    const wsProto = window.location.protocol === "https:" ? "wss://" : "ws://";
    return `${wsProto}${fromEnv}/ws`;
  }

  // Default: same origin (works perfectly for single-container deployment)
  const wsProto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${wsProto}://${window.location.host}/ws`;
}
