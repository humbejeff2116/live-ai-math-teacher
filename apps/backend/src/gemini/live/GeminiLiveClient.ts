import { geminiClient } from "../client/client.js";
import { geminiLiveConfig } from "./liveConfig.js";

type StreamGenerateArgs = {
  model: string;
  input: string;
  signal?: AbortSignal;
};

export class GeminiLiveClient {
  async *streamGenerate(
    args: StreamGenerateArgs
  ): AsyncGenerator<{ text: string }, void, unknown> {
    try {
      const stream = await geminiClient.models.generateContentStream({
        model: args.model,
        contents: [
          {
            role: "user",
            parts: [{ text: args.input }],
          },
        ],
        config: {
          ...geminiLiveConfig.generationConfig,
          abortSignal: args.signal
        },
      });

      for await (const chunk of stream) {
        if (args.signal?.aborted) return;

        const text = chunk.text;
        if (!text) continue;

        yield { text };
      }
    } catch (err) {
      console.error("Error in streamGenerate:", err);
    }
  }
}
