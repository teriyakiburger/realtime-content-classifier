// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { annotateCard, markCardClassifying } from "../src/dom/card-adapter.js";

describe("card classification UI state", () => {
  it("shows a pending state without removing the card", () => {
    document.body.innerHTML = `<article class="content-card"><h2>Content</h2></article>`;
    const card = document.querySelector<HTMLElement>(".content-card")!;
    markCardClassifying(card);
    expect(card.querySelector("h2")?.textContent).toBe("Content");
    expect(card.querySelector("[data-card-classification]")?.textContent).toBe("Classifying...");
    expect(card.querySelector("[data-card-state]")?.textContent).toBe("CLASSIFYING");
    expect(card.dataset.classificationState).toBe("CLASSIFYING");
  });

  it("shows the strategy and latency after classification", () => {
    document.body.innerHTML = `<article class="content-card"></article>`;
    const card = document.querySelector<HTMLElement>(".content-card")!;
    annotateCard(card, { label: "TECH", strategy: "llm-only", latencyMs: 123.4, llmCalled: true });
    expect(card.textContent).toContain("llm-only");
    expect(card.textContent).toContain("123 ms");
    expect(card.querySelector("[data-card-state]")?.textContent).toBe("SUCCESS");
  });

  it("distinguishes hybrid routes and runtime errors from model UNKNOWN", () => {
    const card = document.querySelector<HTMLElement>(".content-card")!;
    annotateCard(card, { label: "UNKNOWN", strategy: "hybrid-rule", latencyMs: 1, llmCalled: false });
    expect(card.textContent).toContain("Hybrid → Rule");
    expect(card.dataset.classificationState).toBe("SUCCESS");
    annotateCard(card, { label: "UNKNOWN", strategy: "hybrid-llm-fallback", latencyMs: 2, llmCalled: true, modelName: "mistral:latest", reason: "ollama-timeout" }, "ERROR");
    expect(card.textContent).toContain("Hybrid → Mistral fallback");
    expect(card.textContent).toContain("ollama-timeout");
    expect(card.dataset.classificationState).toBe("ERROR");
  });
});
