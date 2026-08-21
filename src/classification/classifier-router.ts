import type { ClassificationResult, Classifier, ContentRecord } from "./contracts.js";
import { HybridClassifier } from "./hybrid-classifier.js";

export type ClassifierMode = "rule" | "llm" | "hybrid";

export class ClassifierRouter {
  private mode: ClassifierMode = "rule";

  public constructor(
    private readonly ruleClassifier: Classifier,
    private readonly llmClassifier: Classifier,
    private hybridClassifier?: Classifier
  ) { this.hybridClassifier ??= new HybridClassifier(ruleClassifier, llmClassifier); }

  public setMode(mode: ClassifierMode): void {
    this.mode = mode;
  }

  public getMode(): ClassifierMode {
    return this.mode;
  }

  public classify(content: ContentRecord): ClassificationResult | Promise<ClassificationResult> {
    return this.getActiveClassifier().classify(content);
  }

  private getActiveClassifier(): Classifier {
    return this.mode === "llm" ? this.llmClassifier : this.mode === "hybrid" ? this.hybridClassifier! : this.ruleClassifier;
  }
}
