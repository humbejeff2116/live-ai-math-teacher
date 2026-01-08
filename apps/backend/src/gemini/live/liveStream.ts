
import { geminiClient } from "../client/client";
import { geminiLiveConfig } from "./liveConfig";

export async function sendTextToGeminiLive(text: string): Promise<string> {
  const model = geminiClient.getGenerativeModel({
    model: geminiLiveConfig.model,
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text }],
      },
    ],
    generationConfig: geminiLiveConfig.generationConfig,
    systemInstruction: geminiLiveConfig.systemInstruction,
  });

  return result.response.text();
}
