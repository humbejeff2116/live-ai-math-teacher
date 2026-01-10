import {
  Modality,
} from "@google/genai";

export const geminiLiveConfig = {
  model: "gemini-2.0-flash-live-preview",
  audioModel: "gemini-2.5-flash-native-audio-preview-09-2025",
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 512,
    systemInstruction: `
    You are a calm, patient math teacher.
    You teach linear equations step by step.
    You adapt explanations based on student confusion.
    Never give the final answer immediately.
    `,
    // responseModalities: [Modality.AUDIO],
  },
};
