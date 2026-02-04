import type { VisualHintOverlayV1, VisualHintRequestV1 } from "@shared/types";
import { geminiClient } from "../client/client.js";
import { env } from "../../config/env.js";
import { buildMockOverlay, extractJson } from "./visualHint.utils.js";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "../prompts/index.js";
import WebSocket from "ws";

const VISUAL_HINT_MODEL = "gemini-3.0-flash";

export class VisualHintHandler {
  constructor(private ws: WebSocket) {
    this.ws = ws;
  }

  async handleGenerateVisualHint(request: VisualHintRequestV1) {
    const stepId = request.step.stepId;
    const result = await this.generateVisualHintOverlay(request);
    if ("overlay" in result) {
      this.ws.send(
        JSON.stringify({
          type: "visual_hint_overlay",
          payload: {
            requestId: request.requestId,
            stepId,
            overlay: result.overlay,
          },
        }),
      );
    } else {
      this.ws.send(
        JSON.stringify({
          type: "visual_hint_error",
          payload: {
            requestId: request.requestId,
            stepId,
            message: result.error,
            details: result.details,
          },
        }),
      );
    }
  }

  async generateVisualHintOverlay(
    request: VisualHintRequestV1,
  ): Promise< { overlay: VisualHintOverlayV1 } | { error: string; details?: string }> {
    const shouldMock = env.visualHintMock === "true";
    if (shouldMock) {
      return { overlay: buildMockOverlay(request) };
    }

    try {
      const response = await geminiClient.models.generateContent({
        model: VISUAL_HINT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: buildUserPrompt(request) },
              {
                inlineData: {
                  data: request.render.imagePngBase64,
                  mimeType: "image/png",
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.2,
          maxOutputTokens: 900,
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const raw = response.text?.trim() ?? "";
      const jsonText = extractJson(raw);
      if (!jsonText) {
        return { error: "Model did not return JSON.", details: raw };
      }

      const parsed = JSON.parse(jsonText) as VisualHintOverlayV1;
      if (
        parsed?.version !== "visual_hint_overlay_v1" ||
        parsed?.requestId !== request.requestId
      ) {
        return {
          error: "Model returned an invalid overlay payload.",
          details: jsonText,
        };
      }

      return { overlay: parsed };
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        return { overlay: buildMockOverlay(request) };
      }
      return {
        error: "Failed to generate visual hint overlay.",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

}



