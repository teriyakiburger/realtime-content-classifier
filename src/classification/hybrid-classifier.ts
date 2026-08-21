import type { ClassificationResult, Classifier, ContentRecord } from "./contracts.js";

export class HybridClassifier implements Classifier {
  public constructor(private readonly ruleClassifier: Classifier, private readonly llmClassifier: Classifier) {}

  public async classify(content: ContentRecord): Promise<ClassificationResult> {
    const startedAt = performance.now();
    try {
      const rule = await this.ruleClassifier.classify(content);
      if (rule.label !== "UNKNOWN") {
        return { ...rule, strategy: "hybrid-rule", latencyMs: Math.max(0, performance.now() - startedAt), llmCalled: false };
      }
      try {
        const llm = await this.llmClassifier.classify(content);
        return { ...llm, strategy: "hybrid-llm-fallback", latencyMs: Math.max(0, performance.now() - startedAt), llmCalled: true };
      } catch {
        return this.unknown(startedAt, "llm-failure");
      }
    } catch {
      return this.unknown(startedAt, "rule-failure");
    }
  }

  private unknown(startedAt: number, reason: string): ClassificationResult {
    return { label: "UNKNOWN", strategy: "hybrid-llm-fallback", latencyMs: Math.max(0, performance.now() - startedAt), llmCalled: true, modelName: "mistral:latest", reason };
  }
}
