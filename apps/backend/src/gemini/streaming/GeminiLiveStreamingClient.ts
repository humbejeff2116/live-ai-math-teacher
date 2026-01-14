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
    const stream = this.client.streamGenerate({
      model: opts?.model ?? "gemini-2.0-flash",
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
  }
}
