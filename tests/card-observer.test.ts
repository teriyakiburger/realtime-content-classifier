// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { observeCards } from "../src/dom/card-observer.js";

describe("card observer", () => {
  it("emits newly inserted cards and ignores duplicate identities", async () => {
    document.body.innerHTML = `<section id="feed"></section>`;
    const feed = document.querySelector<HTMLElement>("#feed")!;
    const seen: string[] = [];
    const stop = observeCards(feed, (card) => seen.push(card.dataset.contentId ?? ""));

    feed.insertAdjacentHTML("beforeend", `<article class="content-card" data-content-id="new-1"></article>`);
    await Promise.resolve();
    feed.insertAdjacentHTML("beforeend", `<article class="content-card" data-content-id="new-1"></article>`);
    await Promise.resolve();

    expect(seen).toEqual(["new-1"]);
    stop();
  });
});
