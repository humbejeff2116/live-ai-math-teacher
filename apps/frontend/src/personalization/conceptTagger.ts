export type ConceptTagResult = {
  stepType: string;
  conceptIds: string[];
  matched: string[];
};

const FRACTION_RE = /\d+\s*\/\s*\d+|fraction|denominator|numerator/i;
const FRACTION_SIMPLIFY_RE = /\bsimplify|reduce\b/i;
const FRACTION_LCM_RE = /\bcommon denominator\b|\blcm\b/i;
const EXPAND_RE = /\bexpand\b/i;
const DISTRIBUTIVE_RE = /[a-z0-9]\s*\([^()]*[+-][^()]*\)/i;
const FACTOR_RE = /\bfactor(?:ise|ize)?\b/i;
const LIKE_TERMS_RE = /\bcombine like terms\b/i;
const LINEAR_SOLVE_RE = /\bsolve for\b|\bisolate\b/i;
const EXPONENT_RE = /\^|\bpower\b|\bexponent\b/i;
const ROOTS_RE = /\bsqrt\b|√|\bradical\b/i;
const RATIONALIZE_RE = /\brationalize\b/i;
const WORDPROB_RE =
  /\btotal\b|\brate\b|\bper\b|\beach\b|\bdifference\b/i;
const LET_X_BE_RE = /\blet\s+[a-z]\s+be\b/i;

const addUnique = (list: string[], value: string) => {
  if (!list.includes(value)) list.push(value);
};

export function tagStepConcepts(
  stepText: string,
  problemText?: string | null,
): ConceptTagResult {
  const rawStep = (stepText ?? "").trim();
  const rawProblem = (problemText ?? "").trim();
  if (!rawStep && !rawProblem) {
    return { stepType: "other", conceptIds: [], matched: [] };
  }

  const text = rawStep.toLowerCase();
  const problem = rawProblem.toLowerCase();

  const conceptIds: string[] = [];
  const matched: string[] = [];

  let stepType = "other";

  if (FRACTION_RE.test(text)) {
    stepType = "fractions";
    addUnique(matched, "fractions.base");
    if (FRACTION_SIMPLIFY_RE.test(text)) {
      addUnique(conceptIds, "fractions.simplify");
      addUnique(matched, "fractions.simplify");
    }
    if (FRACTION_LCM_RE.test(text)) {
      addUnique(conceptIds, "fractions.lcm");
      addUnique(matched, "fractions.lcm");
    }
  }

  if (EXPAND_RE.test(text) || DISTRIBUTIVE_RE.test(text)) {
    addUnique(conceptIds, "algebra.expand");
    addUnique(matched, "algebra.expand");
    if (stepType === "other") stepType = "algebra";
  }

  if (FACTOR_RE.test(text)) {
    addUnique(conceptIds, "algebra.factor");
    addUnique(matched, "algebra.factor");
    if (stepType === "other") stepType = "algebra";
  }

  if (LIKE_TERMS_RE.test(text)) {
    addUnique(conceptIds, "algebra.like_terms");
    addUnique(matched, "algebra.like_terms");
    if (stepType === "other") stepType = "algebra";
  }

  if (text.includes("=") && LINEAR_SOLVE_RE.test(text)) {
    addUnique(conceptIds, "linear.solve");
    addUnique(matched, "linear.solve");
    if (stepType === "other") stepType = "linear";
  }

  if (EXPONENT_RE.test(text)) {
    addUnique(conceptIds, "exponents.rules");
    addUnique(matched, "exponents.rules");
    if (stepType === "other") stepType = "exponents";
  }

  if (ROOTS_RE.test(text)) {
    addUnique(conceptIds, "roots.rules");
    addUnique(matched, "roots.rules");
    if (stepType === "other") stepType = "roots";
  }

  if (RATIONALIZE_RE.test(text)) {
    addUnique(conceptIds, "roots.rationalize");
    addUnique(matched, "roots.rationalize");
    if (stepType === "other") stepType = "roots";
  }

  if (LET_X_BE_RE.test(text) || WORDPROB_RE.test(problem)) {
    addUnique(conceptIds, "wordproblems.translation");
    addUnique(matched, "wordproblems.translation");
    if (stepType === "other") stepType = "wordproblems";
  }

  return {
    stepType,
    conceptIds,
    matched,
  };
}
