import {
  GeminiStreamingClient,
  GeminiStreamChunk,
} from "./GeminiStreamingClient.js";
import { GeminiLiveClient } from "../live/GeminiLiveClient.js";

export class GeminiLiveStreamingClient implements GeminiStreamingClient {
  private client = new GeminiLiveClient();

  async *streamText(
    prompt: string,
    opts?: {
      signal?: AbortSignal;
      model?: string;
    }
  ): AsyncIterable<GeminiStreamChunk> {
    try {
      const stream = await this.client.streamGenerate({
        model: opts?.model ?? "gemini-2.5-flash",
        input: prompt,
        signal: opts?.signal,
      });

      for await (const chunk of stream) {
        if (!chunk.text) continue;

        yield {
          text: chunk.text,
          isFinal: false,
        };
      }

      // Explicit final marker
      yield { isFinal: true };
    } catch (err) {
      console.error("Error in streamText:", err);
    }
  }
}
