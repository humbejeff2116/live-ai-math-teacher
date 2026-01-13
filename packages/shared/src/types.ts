
export type EquationStep = {
  id: string;
  /** Monotonic index within the solution */
  index: number;
  /** Classification of the step */
  type: "setup" | "transform" | "simplify" | "result";
  /** Human explanation (stream-safe) */
  text: string;
  /** Canonical equation form */
  equation: string;
};

