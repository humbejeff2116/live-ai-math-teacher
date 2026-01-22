import http from "node:http";
import { app } from "./app.js";
import { startWebSocketServer } from "./websocket/wsServer.js";
import { env } from "./config/env.js";

const server = http.createServer(app);

startWebSocketServer(server);

server.listen(env.port, "0.0.0.0", () => {
  console.log(`Backend running on http://0.0.0.0:${env.port}`);
});
