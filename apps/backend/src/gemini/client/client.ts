import { env } from "../../config/env";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const geminiClient = new GoogleGenerativeAI(env.gemini.apiKey);