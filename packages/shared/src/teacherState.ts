export type TeacherState =
  | "idle" // session created, nothing happening
  // | "listening" // student is speaking (mic open)
  | "thinking" // Gemini request sent, no output yet
  | "explaining" // Gemini is streaming text + audio
  | "re-explaining" // Gemini is re-explaining a specific step
  | "interrupted" // student barged in mid-explanation
  | "waiting"; // explanation finished, waiting for student


export type TeacherSignal =
  | { type: "teacher_listening" }
  | { type: "teacher_thinking" }
  | { type: "teacher_explaining"; stepIndex?: number }
  | { type: "teacher_reexplaining"; stepIndex?: number }
  | { type: "teacher_interrupted"; lastCompletedStepIndex: number | null }
  | { type: "teacher_waiting" };