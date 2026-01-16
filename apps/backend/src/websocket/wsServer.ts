import WebSocket, { WebSocketServer } from "ws";
import { liveSocketHandler } from "./liveSocketHandler";

export function startWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WS client connected");

    liveSocketHandler(ws);

    ws.on("close", () => {
      console.log("WS client disconnected");
    });

    ws.on("error", (err) => {
      console.error("WS error:", err);
    });
  });
  console.log("WebSocket server initialized");
}
