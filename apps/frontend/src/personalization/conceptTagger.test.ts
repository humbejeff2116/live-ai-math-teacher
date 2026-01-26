import { describe, expect, it } from "vitest";
import { tagStepConcepts } from "./conceptTagger";

describe("tagStepConcepts", () => {
  it("tags fraction simplification", () => {
    const result = tagStepConcepts("simplify 6/8");
    expect(result.conceptIds).toEqual(["fractions.simplify"]);
  });

  it("tags common denominator / LCM", () => {
    const result = tagStepConcepts("find common denominator");
    expect(result.conceptIds).toEqual(["fractions.lcm"]);
  });

  it("tags expansion with distributive pattern", () => {
    const result = tagStepConcepts("expand 2(x+3)");
    expect(result.conceptIds).toEqual(["algebra.expand"]);
  });

  it("tags factoring", () => {
    const result = tagStepConcepts("factor x^2+5x+6");
    expect(result.conceptIds).toEqual(["algebra.factor"]);
  });

  it("tags linear solve when isolate language appears", () => {
    const result = tagStepConcepts("solve for x: 2x+3=7");
    expect(result.conceptIds).toEqual(["linear.solve"]);
  });

  it("tags exponents rules", () => {
    const result = tagStepConcepts("x^2 * x^3");
    expect(result.conceptIds).toEqual(["exponents.rules"]);
  });

  it("tags roots rules", () => {
    const result = tagStepConcepts("√8 = 2√2");
    expect(result.conceptIds).toEqual(["roots.rules"]);
  });

  it("dedupes and keeps stable order", () => {
    const result = tagStepConcepts("simplify fractions with common denominator 6/8");
    expect(result.conceptIds).toEqual([
      "fractions.simplify",
      "fractions.lcm",
    ]);
  });
});
