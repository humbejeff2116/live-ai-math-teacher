import express from "express";
import cors from "cors";
import { startWebSocketServer } from "./transport/wsServer";

export const app = express();

app.use(cors());
app.use(express.json());



// startWebSocketServer(httpServer);
