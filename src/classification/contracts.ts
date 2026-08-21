export type ClassificationLabel = "TECH" | "NEWS" | "ENTERTAINMENT" | "OTHER" | "UNKNOWN";

export interface ContentRecord {
  id: string;
  text: string;
  source: string;
  insertedAt: number;
}

export interface ClassificationResult {
  label: ClassificationLabel;
  strategy: "rule-only" | "llm-only" | "hybrid-rule" | "hybrid-llm-fallback";
  latencyMs: number;
  llmCalled: boolean;
  modelName?: string;
  reason?: string;
}

export interface Classifier {
  classify(content: ContentRecord): ClassificationResult | Promise<ClassificationResult>;
}

export interface RuleSet {
  tech: readonly RegExp[];
  news: readonly RegExp[];
  entertainment: readonly RegExp[];
  other: readonly RegExp[];
}
