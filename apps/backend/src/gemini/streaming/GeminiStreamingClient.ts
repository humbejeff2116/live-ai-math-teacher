export interface GeminiStreamChunk {
  text?: string;
  isFinal?: boolean;
}

export interface GeminiStreamingClient {
  streamText(
    prompt: string,
    opts?: {
      signal?: AbortSignal;
      model?: string;
    }
  ): AsyncIterable<GeminiStreamChunk>;
}
