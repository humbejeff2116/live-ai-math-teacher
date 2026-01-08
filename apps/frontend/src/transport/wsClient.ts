import type { ClientToServerMessage, ServerToClientMessage } from "./wsTypes";

type MessageHandler = (msg: ServerToClientMessage) => void;

export class LiveWSClient {
  private socket: WebSocket | null = null;
  private handler: MessageHandler;

  constructor(handler: MessageHandler) {
    this.handler = handler;
  }

  connect(url: string) {
    if (this.socket) return;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log("WS connected");
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerToClientMessage;
      this.handler(message);
    };

    this.socket.onerror = (err) => {
      console.error("WS error", err);
    };

    this.socket.onclose = () => {
      console.log("WS closed");
      this.socket = null;
    };
  }

  send(message: ClientToServerMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("WS not connected");
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  close() {
    if (!this.socket) return;

    this.send({ type: "close" });
    this.socket.close();
    this.socket = null;
  }
}
