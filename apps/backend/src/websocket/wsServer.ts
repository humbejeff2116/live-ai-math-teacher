import WebSocket, { WebSocketServer } from "ws";
import { liveSocketHandler } from "./liveSocketHandler.js";
import type http from "node:http";
import { env } from "../config/env.js";

export function startWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const origin = req.headers.origin;
    if (!origin || !env.allowedOrigins.includes(origin)) {
      console.log(`Connection from disallowed origin: ${origin} closed.`);
      ws.close(1008, "Origin not allowed");
      return;
    }
    console.log("WS client connected with allowed origin:", origin);

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
