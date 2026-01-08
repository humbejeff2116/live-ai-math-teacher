/* eslint-disable @typescript-eslint/no-explicit-any */
export class GeminiWebSocketClient {
  private socket: WebSocket;

  constructor(sessionId: string, onMessage: (msg: any) => void) {
    this.socket = new WebSocket(`ws://localhost:3000?sessionId=${sessionId}`);

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
  }

  close() {
    this.socket.close();
  }
}
