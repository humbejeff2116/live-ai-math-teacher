export interface Equation {
  equation: string;
  answer: number;
}

export const LINEAR_EQUATIONS: Equation[] = [
  { equation: "2x + 3 = 7", answer: 2 },
  { equation: "x - 4 = 10", answer: 14 },
  { equation: "3x = 12", answer: 4 },
];

export function getRandomEquation(): Equation {
  return LINEAR_EQUATIONS[Math.floor(Math.random() * LINEAR_EQUATIONS.length)];
}
