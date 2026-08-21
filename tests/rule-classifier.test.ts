import { describe, expect, it } from "vitest";
import { RuleClassifier } from "../src/classification/rule-classifier.js";
import type { ContentRecord } from "../src/classification/contracts.js";

const record = (text: string): ContentRecord => ({
  id: "case-1",
  text,
  insertedAt: 0,
  source: "demo"
});

describe("RuleClassifier", () => {
  const classifier = new RuleClassifier({
    tech: [/typescript/i],
    news: [/headline/i],
    entertainment: [/movie/i],
    other: [/welcome/i]
  });

  it("classifies matching content as TECH", () => {
    expect(classifier.classify(record("TypeScript release notes")).label).toBe("TECH");
  });

  it("classifies matching content as NEWS", () => {
    expect(classifier.classify(record("Today's headline")).label).toBe("NEWS");
  });

  it("classifies matching content as ENTERTAINMENT", () => {
    expect(classifier.classify(record("New movie trailer")).label).toBe("ENTERTAINMENT");
  });

  it("classifies matching content as OTHER", () => {
    expect(classifier.classify(record("Welcome to the local demo")).label).toBe("OTHER");
  });

  it("returns UNKNOWN when no rule matches", () => {
    expect(classifier.classify(record("Ambiguous local fixture")).label).toBe("UNKNOWN");
  });

  it("fails open when rules conflict", () => {
    const conflicting = new RuleClassifier({
      tech: [/fixture/i], news: [/fixture/i], entertainment: [], other: []
    });
    const result = conflicting.classify(record("fixture"));
    expect(result.label).toBe("UNKNOWN");
    expect(result.reason).toBe("conflicting-rules");
  });

  it("returns a common classifier result without making an LLM call", () => {
    const result = classifier.classify(record("Welcome"));
    expect(result).toMatchObject({ label: "OTHER", strategy: "rule-only", llmCalled: false });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
