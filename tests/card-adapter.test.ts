// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { annotateCard, extractCardContent } from "../src/dom/card-adapter.js";
import type { ClassificationResult } from "../src/classification/contracts.js";

const result: ClassificationResult = {
  label: "TECH",
  strategy: "rule-only",
  latencyMs: 1,
  llmCalled: false
};

describe("card DOM adapter", () => {
  it("extracts title, source, and description metadata", () => {
    document.body.innerHTML = `
      <article class="content-card" data-content-id="card-1">
        <h2 data-card-title>TypeScript update</h2>
        <p data-card-source>Local engineering feed</p>
        <p data-card-description>A local fixture description.</p>
      </article>`;

    const card = document.querySelector<HTMLElement>(".content-card")!;
    expect(extractCardContent(card)).toMatchObject({
      id: "card-1",
      title: "TypeScript update",
      source: "Local engineering feed",
      description: "A local fixture description."
    });
  });

  it("annotates a card with a visible classification label", () => {
    document.body.innerHTML = `<article class="content-card"></article>`;
    const card = document.querySelector<HTMLElement>(".content-card")!;

    annotateCard(card, result);

    const label = card.querySelector<HTMLElement>("[data-card-classification]");
    expect(label?.textContent).toBe("TECH");
    expect(card.dataset.classification).toBe("TECH");
  });
});
