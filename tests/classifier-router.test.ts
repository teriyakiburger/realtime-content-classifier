import { describe, expect, it, vi } from "vitest";
import { ClassifierRouter } from "../src/classification/classifier-router.js";
import type { ClassificationResult, ContentRecord } from "../src/classification/contracts.js";

const content: ContentRecord = { id: "router-1", text: "fixture", source: "local", insertedAt: 0 };
const result = (strategy: ClassificationResult["strategy"]): ClassificationResult => ({
  label: "TECH", strategy, latencyMs: 1, llmCalled: strategy === "llm-only"
});

describe("ClassifierRouter", () => {
  it("uses LLMClassifier for cards inserted after switching Rule -> LLM", async () => {
    const rule = { classify: vi.fn(() => result("rule-only")) };
    const llm = { classify: vi.fn(async () => result("llm-only")) };
    const router = new ClassifierRouter(rule, llm);
    router.setMode("llm");
    await router.classify(content);
    expect(rule.classify).not.toHaveBeenCalled();
    expect(llm.classify).toHaveBeenCalledWith(content);
  });

  it("does not classify when the mode is changed by itself", () => {
    const rule = { classify: vi.fn(() => result("rule-only")) };
    const llm = { classify: vi.fn(async () => result("llm-only")) };
    const router = new ClassifierRouter(rule, llm);
    router.setMode("llm");
    expect(rule.classify).not.toHaveBeenCalled();
    expect(llm.classify).not.toHaveBeenCalled();
  });

  it("reclassifies existing cards with the newly selected classifier", async () => {
    const rule = { classify: vi.fn(() => result("rule-only")) };
    const llm = { classify: vi.fn(async () => result("llm-only")) };
    const router = new ClassifierRouter(rule, llm);
    await router.classify(content);
    router.setMode("llm");
    await router.classify(content);
    expect(rule.classify).toHaveBeenCalledTimes(1);
    expect(llm.classify).toHaveBeenCalledTimes(1);
  });
});
