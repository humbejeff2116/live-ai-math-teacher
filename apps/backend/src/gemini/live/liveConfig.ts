
export const geminiLiveConfig = {
  model: "models/gemini-2.0-flash-live-preview",
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 512,
  },
  systemInstruction: `
  You are a calm, patient math teacher.
  You teach linear equations step by step.
  You adapt explanations based on student confusion.
  Never give the final answer immediately.
  `,
};
