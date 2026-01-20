import { env } from "../../config/env.js";
import { GoogleGenAI } from "@google/genai";

export const geminiClient = new GoogleGenAI({
  apiKey: env.gemini.apiKey,
});
