import WebSocket, { WebSocketServer } from "ws";
import { liveSocketHandler } from "./liveSocketHandler.js";
import type http from "node:http";

export function startWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

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

  console.log("WebSocket server initialized on /ws");
}
