import WebSocket, { WebSocketServer } from "ws";
import { ClientToServerMessage, ServerToClientMessage } from "./wsTypes";
import { sendTextToGeminiLive } from "../gemini/live/liveStream";

export function startWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WS client connected");

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as ClientToServerMessage;

        if (message.type === "user_message") {
          const aiText = await sendTextToGeminiLive(message.payload.text);

          const response: ServerToClientMessage = {
            type: "ai_message",
            payload: { text: aiText },
          };

          ws.send(JSON.stringify(response));
        }

        if (message.type === "close") {
          ws.close();
        }
      } catch (err) {
        console.error("WS error", err);

        const errorResponse: ServerToClientMessage = {
          type: "error",
          payload: { message: "Invalid message" },
        };

        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on("close", () => {
      console.log("WS client disconnected");
    });
  });

  console.log("WebSocket server initialized");
}
