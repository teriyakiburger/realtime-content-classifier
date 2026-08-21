import type {
  ClassificationResult,
  Classifier,
  ContentRecord,
  RuleSet
} from "./contracts.js";

export class RuleClassifier implements Classifier {
  public constructor(private readonly rules: RuleSet) {}

  public classify(content: ContentRecord): ClassificationResult {
    const startedAt = performance.now();
    let result: Pick<ClassificationResult, "label" | "reason">;

    try {
      const matches = [
        ["TECH", this.matchesAny(this.rules.tech, content.text)],
        ["NEWS", this.matchesAny(this.rules.news, content.text)],
        ["ENTERTAINMENT", this.matchesAny(this.rules.entertainment, content.text)],
        ["OTHER", this.matchesAny(this.rules.other, content.text)]
      ] as const;
      const matched = matches.filter(([, isMatch]) => isMatch).map(([label]) => label);

      if (matched.length > 1) {
        result = { label: "UNKNOWN", reason: "conflicting-rules" };
      } else if (matched.length === 1) {
        result = { label: matched[0] };
      } else {
        result = { label: "UNKNOWN", reason: "no-rule-match" };
      }
    } catch {
      result = { label: "UNKNOWN", reason: "rule-error" };
    }

    return {
      ...result,
      strategy: "rule-only",
      latencyMs: Math.max(0, performance.now() - startedAt),
      llmCalled: false
    };
  }

  private matchesAny(rules: readonly RegExp[], text: string): boolean {
    return rules.some((rule) => {
      rule.lastIndex = 0;
      return rule.test(text);
    });
  }
}
