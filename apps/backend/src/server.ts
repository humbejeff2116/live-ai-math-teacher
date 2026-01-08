import http from "node:http";
import { app } from "./app";
import { startWebSocketServer } from "./websocket/wsServer";
import { env } from "./config/env";

const server = http.createServer(app);

startWebSocketServer(server);

server.listen(env.port, () => {
  console.log(`Backend running on http://localhost:${env.port}`);
});
