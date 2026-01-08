import express from "express";
import cors from "cors";
import { startWebSocketServer } from "./websocket/wsServer";
import { liveRouter } from "./api/live.controller";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/live", liveRouter);

// startWebSocketServer(httpServer);
