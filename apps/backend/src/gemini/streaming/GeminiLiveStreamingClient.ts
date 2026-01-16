import {
  GeminiStreamingClient,
  GeminiStreamChunk,
} from "./GeminiStreamingClient";
import { GeminiLiveClient } from "../live/GeminiLiveClient";

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

      console.log("Started streaming text from Gemini Live", JSON.stringify(stream));

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
