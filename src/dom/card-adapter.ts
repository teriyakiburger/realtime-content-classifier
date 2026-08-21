import type { ClassificationResult, ContentRecord } from "../classification/contracts.js";

export interface CardContent extends ContentRecord {
  title: string;
  description: string;
}

export function extractCardContent(card: HTMLElement): CardContent {
  const read = (selector: string): string => card.querySelector<HTMLElement>(selector)?.textContent?.trim() ?? "";
  return {
    id: card.dataset.contentId ?? "",
    title: read("[data-card-title]"),
    source: read("[data-card-source]"),
    description: read("[data-card-description]"),
    text: `${read("[data-card-title]")} ${read("[data-card-description]")}`.trim(),
    insertedAt: Number(card.dataset.insertedAt ?? Date.now())
  };
}

export function annotateCard(card: HTMLElement, result: ClassificationResult, state: "SUCCESS" | "ERROR" = "SUCCESS"): void {
  let label = card.querySelector<HTMLElement>("[data-card-classification]");
  if (!label) {
    label = document.createElement("span");
    label.dataset.cardClassification = "";
    label.className = "classification-label";
    card.append(label);
  }
  label.textContent = result.label;
  card.dataset.classification = result.label;
  card.dataset.classificationState = state;
  card.querySelector("[data-card-meta]")?.remove();
  card.querySelector("[data-card-state]")?.remove();
  const route = result.strategy === "hybrid-rule" ? "Hybrid → Rule" : result.strategy === "hybrid-llm-fallback" ? "Hybrid → Mistral fallback" : result.strategy === "llm-only" ? "Mistral 7B" : "Rule";
  const meta = document.createElement("div");
  meta.dataset.cardMeta = "";
  meta.className = "card-meta";
  const addChip = (text: string, className = "") => { const chip = document.createElement("span"); chip.className = `chip ${className}`.trim(); chip.textContent = text; meta.append(chip); };
  addChip(`${result.strategy} ·`, "chip-strategy");
  addChip(route, result.strategy.startsWith("hybrid") ? "chip-route" : "chip-route");
  if (result.modelName) addChip(result.modelName, "chip-model");
  addChip(`${Math.round(result.latencyMs)} ms`, "chip-latency");
  addChip(result.llmCalled ? "LLM called" : "LLM not called", result.llmCalled ? "chip-llm" : "chip-muted");
  if (result.reason) addChip(result.reason, "chip-error-detail");
  card.append(meta);
  const status = document.createElement("small");
  status.dataset.cardState = "";
  status.className = "status-badge";
  status.textContent = state;
  card.append(status);
}

export function markCardClassifying(card: HTMLElement): void {
  let label = card.querySelector<HTMLElement>("[data-card-classification]");
  if (!label) {
    label = document.createElement("span");
    label.dataset.cardClassification = "";
    label.className = "classification-label";
    card.append(label);
  }
  label.textContent = "Classifying...";
  card.dataset.classification = "PENDING";
  card.dataset.classificationState = "CLASSIFYING";
  card.querySelector("[data-card-meta]")?.remove();
  card.querySelector("[data-card-state]")?.remove();
  const status = document.createElement("small");
  status.dataset.cardState = "";
  status.className = "status-badge";
  status.textContent = "CLASSIFYING";
  card.append(status);
}
