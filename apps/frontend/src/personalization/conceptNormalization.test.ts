import { describe, expect, it } from "vitest";
import { normalizeConceptIds } from "./conceptNormalization";

describe("normalizeConceptIds", () => {
  it("aliases and rolls up linear.solve", () => {
    expect(normalizeConceptIds(["linear.solve"])).toEqual([
      "equations.solve",
      "equations",
    ]);
  });

  it("aliases fractions.lcm and adds parent once", () => {
    expect(normalizeConceptIds(["fractions.lcm", "fractions.simplify"])).toEqual([
      "fractions.common_denominator",
      "fractions.simplify",
      "fractions",
    ]);
  });

  it("dedupes and preserves ordering", () => {
    expect(
      normalizeConceptIds([
        "fractions.simplify",
        "fractions.simplify",
        "fractions.lcm",
      ]),
    ).toEqual([
      "fractions.simplify",
      "fractions.common_denominator",
      "fractions",
    ]);
  });
});
