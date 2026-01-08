import WebSocket, { WebSocketServer } from "ws";
import { registerSessionSocket, removeSessionSocket } from "./wsSessionHub";

export function startWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      socket.close();
      return;
    }

    registerSessionSocket(sessionId, socket);

    socket.on("close", () => {
      removeSessionSocket(sessionId);
    });

    socket.send(JSON.stringify({ type: "event", name: "start" }));
  });
}
