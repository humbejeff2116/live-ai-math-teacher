import type {
  ServerToClientMessage,
  ClientToServerMessage,
} from "@shared/types";

type MessageHandler = (msg: ServerToClientMessage) => void;

export class LiveWSClient {
  private socket: WebSocket | null = null;
  private handler: MessageHandler;

  public onOpen?: () => void;
  public onClose?: () => void;

  constructor(handler: MessageHandler) {
    this.handler = handler;
  }

  connect(url: string) {
    // If a socket already exists and isn't fully closed, don't create a new one.
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) return;

    const ws = new WebSocket(url);
    this.socket = ws;

    ws.onopen = () => {
      // Ignore if this isn't the active socket anymore
      if (this.socket !== ws) return;
      console.log("WS connected");
      this.onOpen?.();
    };

    ws.onmessage = (event) => {
      if (this.socket !== ws) return;
      try {
        const message = JSON.parse(event.data) as ServerToClientMessage;
        this.handler(message);
      } catch (err) {
        console.error("WS message parse error", err);
      }
    };

    ws.onerror = (err) => {
      if (this.socket !== ws) return;
      console.error("WS error", err);
    };

    ws.onclose = () => {
      // Ignore if this isn't the active socket anymore
      if (this.socket !== ws) return;

      console.log("WS closed");
      this.socket = null;
      this.onClose?.();
    };
  }

  send(message: ClientToServerMessage) {
    const ws = this.socket;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WS not connected");
      return;
    }

    ws.send(JSON.stringify(message));
  }

  /**
   * Safe, idempotent close.
   * - Does NOT send `{ type: "close" }` (your server logs show it doesn't expect it).
   * - Detaches handlers to prevent late events firing into stale state.
   * - Optionally takes a code/reason (browser may ignore custom code in some cases).
   */
  close(code?: number, reason?: string) {
    const ws = this.socket;
    if (!ws) return;

    // Mark inactive immediately so future events are ignored
    this.socket = null;

    // Detach handlers so stale events don't call into app logic
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;

    try {
      // Only call close if it isn't already closing/closed
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        // NOTE: Some browsers ignore custom codes/reasons here.
        ws.close(code, reason);
      }
    } catch (err) {
      console.warn("WS close failed", err);
    }
  }
}
