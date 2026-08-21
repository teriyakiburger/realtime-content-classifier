import { afterEach, describe, expect, it, vi } from "vitest";
import { LLMClassifier } from "../src/classification/llm-classifier.js";
import { OllamaClient } from "../src/llm/ollama-client.js";
import type { ContentRecord } from "../src/classification/contracts.js";

const content: ContentRecord = {
  id: "llm-1",
  text: "A local report about TypeScript tooling",
  source: "local fixture",
  insertedAt: 0
};

const response = (body: unknown, ok = true): Response =>
  new Response(JSON.stringify(body), { status: ok ? 200 : 500, headers: { "content-type": "application/json" } });

describe("LLMClassifier", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts valid structured output", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ message: { content: '{"label":"TECH"}' } }));
    const classifier = new LLMClassifier(new OllamaClient({ fetcher, timeoutMs: 100 }));

    await expect(classifier.classify(content)).resolves.toMatchObject({
      label: "TECH", strategy: "llm-only", llmCalled: true
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const request = JSON.parse(fetcher.mock.calls[0][1].body as string);
    expect(request.model).toBe("gemma4:12b");
    expect(request.format).toBe("json");
    expect(request.messages[1].content).toContain(content.text);
    expect(request.messages[1].content).not.toContain(content.insertedAt.toString());
  });

  it.each([
    ["malformed JSON", "not json"],
    ["invalid category", '{"label":"SPAM"}'],
    ["missing label", "{}"]
  ])("returns UNKNOWN for %s", async (_name, modelContent) => {
    const fetcher = vi.fn().mockResolvedValue(response({ message: { content: modelContent } }));
    const result = await new LLMClassifier(new OllamaClient({ fetcher })).classify(content);
    expect(result).toMatchObject({ label: "UNKNOWN", llmCalled: true });
  });

  it("fails open on HTTP failure", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({}, false));
    await expect(new LLMClassifier(new OllamaClient({ fetcher })).classify(content))
      .resolves.toMatchObject({ label: "UNKNOWN", reason: "ollama-request-failed" });
  });

  it("fails open on network failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    await expect(new LLMClassifier(new OllamaClient({ fetcher })).classify(content))
      .resolves.toMatchObject({ label: "UNKNOWN", reason: "ollama-request-failed" });
  });

  it("fails open on timeout", async () => {
    const fetcher = vi.fn((_url: RequestInfo | URL, init: RequestInit = {}) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")));
    }));
    await expect(new LLMClassifier(new OllamaClient({ fetcher, timeoutMs: 1 })).classify(content))
      .resolves.toMatchObject({ label: "UNKNOWN", reason: "ollama-timeout" });
  });

  it("does not abort a request at the old 15-second default", async () => {
    vi.useFakeTimers();
    let resolveRequest!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
    const request = new LLMClassifier(new OllamaClient({ fetcher })).classify(content);
    await vi.advanceTimersByTimeAsync(15_000);
    resolveRequest(response({ message: { content: '{"label":"TECH"}' } }));
    await expect(request).resolves.toMatchObject({ label: "TECH" });
  });
});
