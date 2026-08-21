import type { ClassificationLabel, ClassificationResult, Classifier, ContentRecord } from "./contracts.js";
import { OllamaClient, OllamaTimeoutError } from "../llm/ollama-client.js";

const labels = new Set<ClassificationLabel>(["TECH", "NEWS", "ENTERTAINMENT", "OTHER", "UNKNOWN"]);

export class LLMClassifier implements Classifier {
  public constructor(private readonly client: OllamaClient) {}

  public async classify(content: ContentRecord): Promise<ClassificationResult> {
    const startedAt = performance.now();
    try {
      const raw = await this.client.classify(content);
      const parsed: unknown = JSON.parse(raw);
      const label = this.readLabel(parsed);
      if (!label) return this.result(startedAt, "UNKNOWN", "invalid-model-output");
      return this.result(startedAt, label);
    } catch (error) {
      return this.result(startedAt, "UNKNOWN", error instanceof OllamaTimeoutError ? "ollama-timeout" : "ollama-request-failed");
    }
  }

  private readLabel(value: unknown): ClassificationLabel | undefined {
    if (typeof value !== "object" || value === null || !("label" in value)) return undefined;
    const label = value.label;
    return typeof label === "string" && labels.has(label as ClassificationLabel) ? label as ClassificationLabel : undefined;
  }

  private result(startedAt: number, label: ClassificationLabel, reason?: string): ClassificationResult {
    return { label, strategy: "llm-only", latencyMs: Math.max(0, performance.now() - startedAt), llmCalled: true, modelName: "mistral:latest", ...(reason ? { reason } : {}) };
  }
}
