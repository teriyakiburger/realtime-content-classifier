import "./styles.css";
import { RuleClassifier } from "./classification/rule-classifier.js";
import { annotateCard, extractCardContent, markCardClassifying } from "./dom/card-adapter.js";
import { observeCards } from "./dom/card-observer.js";
import { LLMClassifier } from "./classification/llm-classifier.js";
import { OllamaClient } from "./llm/ollama-client.js";
import { ClassifierRouter } from "./classification/classifier-router.js";
import { createDemoSamplePicker } from "./demo-samples.js";

const classifier = new RuleClassifier({
  tech: [/typescript|javascript|software|code/i],
  news: [/headline|breaking|report/i],
  entertainment: [/movie|music|game|trailer/i],
  other: [/welcome|local demo|community/i]
});

const feed = document.querySelector<HTMLElement>("#feed")!;
const insertButton = document.querySelector<HTMLButtonElement>("#insert-card")!;
const modeSelect = document.querySelector<HTMLSelectElement>("#classifier-mode")!;
const modeStatus = document.querySelector<HTMLElement>("#mode-status")!;
const customForm = document.querySelector<HTMLFormElement>("#custom-card-form")!;
const customTitle = document.querySelector<HTMLInputElement>("#custom-title")!;
const customSource = document.querySelector<HTMLInputElement>("#custom-source")!;
const customDescription = document.querySelector<HTMLTextAreaElement>("#custom-description")!;
const ruleClassifier = classifier;
const llmClassifier = new LLMClassifier(new OllamaClient({
  baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL ?? "/ollama",
  model: "mistral:latest"
}));
const classifierRouter = new ClassifierRouter(ruleClassifier, llmClassifier);
let nextId = 1;

const nextDemoSample = createDemoSamplePicker();

async function classifyCard(card: HTMLElement): Promise<void> {
  console.info("[checkpoint-8] active classifier classify called", { mode: classifierRouter.getMode(), id: card.dataset.contentId });
  markCardClassifying(card);
  const result = await classifierRouter.classify(extractCardContent(card));
  annotateCard(card, result, result.reason ? "ERROR" : "SUCCESS");
}

const stopObserving = observeCards(feed, classifyCard);

function addCard(title: string, source: string, description: string): void {
  const card = document.createElement("article");
  card.className = "content-card";
  card.dataset.contentId = `card-${nextId++}`;
  card.dataset.insertedAt = String(Date.now());
  card.innerHTML = `<h2 data-card-title></h2><p class="source" data-card-source></p><p data-card-description></p>`;
  card.querySelector("[data-card-title]")!.textContent = title;
  card.querySelector("[data-card-source]")!.textContent = source;
  card.querySelector("[data-card-description]")!.textContent = description;
  feed.prepend(card);
  console.info("[checkpoint-4] new card inserted into DOM", { id: card.dataset.contentId });
}

insertButton.addEventListener("click", () => {
  console.info("[checkpoint-3] Insert new card click handler fired");
  const [title, source, description] = nextDemoSample();
  addCard(title, source, description);
});

customForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addCard(customTitle.value.trim(), customSource.value.trim() || "Custom input", customDescription.value.trim());
  customForm.reset();
});

modeSelect.addEventListener("change", () => {
  const mode = modeSelect.value === "llm" ? "llm" : modeSelect.value === "hybrid" ? "hybrid" : "rule";
  console.info("[checkpoint-1] LLM mode change event fired", { mode });
  classifierRouter.setMode(mode);
  console.info("[checkpoint-2] active classifier changed", { mode: classifierRouter.getMode() });
  modeStatus.textContent = `Current mode: ${mode === "llm" ? "Mistral 7B" : mode === "hybrid" ? "Hybrid (Rule + Mistral 7B)" : "Rule"}`;
});

window.addEventListener("beforeunload", stopObserving, { once: true });
