import { env } from "../config/env";
import { GoogleGenerativeAI } from "@google/generative-ai";

// import { GeminiLiveAdapter } from "./live/GeminiLiveAdapter";


export const geminiClient = new GoogleGenerativeAI(env.gemini.apiKey);

// export class GeminiClient {
//   createLiveAdapter(sessionId: string) {
//     return new GeminiLiveAdapter(sessionId);
//   }
// }
