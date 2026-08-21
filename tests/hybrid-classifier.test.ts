import { describe, expect, it, vi } from "vitest";
import { HybridClassifier } from "../src/classification/hybrid-classifier.js";
import type { ClassificationResult, ContentRecord } from "../src/classification/contracts.js";

const content: ContentRecord = { id: "hybrid-1", text: "fixture", source: "local", insertedAt: 0 };
const ruleResult = (label: ClassificationResult["label"], reason?: string): ClassificationResult => ({ label, strategy: "rule-only", latencyMs: 1, llmCalled: false, ...(reason ? { reason } : {}) });
const llmResult = (label: ClassificationResult["label"] = "TECH"): ClassificationResult => ({ label, strategy: "llm-only", latencyMs: 20, llmCalled: true, modelName: "mistral:latest" });

describe("HybridClassifier", () => {
  it.each(["TECH", "NEWS", "ENTERTAINMENT", "OTHER"] as const)("returns confident %s from Rule without LLM", async (label) => {
    const llm = { classify: vi.fn(async () => llmResult()) };
    const hybrid = new HybridClassifier({ classify: () => ruleResult(label) }, llm);
    const result = await hybrid.classify(content);
    expect(result).toMatchObject({ label, strategy: "hybrid-rule", llmCalled: false });
    expect(llm.classify).not.toHaveBeenCalled();
  });

  it.each(["no-rule-match", "conflicting-rules"])("falls back for %s", async (reason) => {
    const llm = { classify: vi.fn(async () => llmResult("NEWS")) };
    const result = await new HybridClassifier({ classify: () => ruleResult("UNKNOWN", reason) }, llm).classify(content);
    expect(result).toMatchObject({ label: "NEWS", strategy: "hybrid-llm-fallback", llmCalled: true, modelName: "mistral:latest" });
    expect(llm.classify).toHaveBeenCalledTimes(1);
  });

  it("returns UNKNOWN for invalid fallback output", async () => {
    const result = await new HybridClassifier({ classify: () => ruleResult("UNKNOWN") }, { classify: vi.fn(async () => ({ ...llmResult(), label: "UNKNOWN" as const, reason: "invalid-model-output" })) }).classify(content);
    expect(result).toMatchObject({ label: "UNKNOWN", strategy: "hybrid-llm-fallback", llmCalled: true });
  });

  it("fails open on timeout/network errors and never throws", async () => {
    const llm = { classify: vi.fn(async () => { throw new Error("timeout"); }) };
    const result = await new HybridClassifier({ classify: () => ruleResult("UNKNOWN") }, llm).classify(content);
    expect(result).toMatchObject({ label: "UNKNOWN", strategy: "hybrid-llm-fallback", llmCalled: true });
  });
});
