import type { ContentRecord } from "../classification/contracts.js";

export interface OllamaClientOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export class OllamaTimeoutError extends Error {
  public constructor() {
    super("Ollama request timed out");
    this.name = "OllamaTimeoutError";
  }
}

export class OllamaClient {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;

  public constructor(options: OllamaClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "/ollama").replace(/\/$/, "");
    this.model = options.model ?? "gemma4:12b";
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  public async classify(content: ContentRecord): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = `${this.baseUrl}/api/chat`;
    console.info("[checkpoint-9] OllamaClient.chat reached", { id: content.id });
    console.info("[ollama] request started", { url, model: this.model, contentId: content.id });
    const requestBody = JSON.stringify({
      model: this.model,
      stream: false,
      format: "json",
          messages: [
            { role: "system", content: "You are a strict content classifier. Classify into exactly one of TECH, NEWS, ENTERTAINMENT, OTHER, UNKNOWN. TECH covers software, programming, AI, computing, hardware, cybersecurity, cloud, developer tools, engineering, and technical products. NEWS covers timely real-world events, politics, economics, business developments, policy, public affairs, incidents, company announcements, and current events. ENTERTAINMENT covers movies, television, music, games, celebrities, anime, trailers, releases, reviews, performances, and pop culture. OTHER is only for a clearly identifiable topic outside the three main domains. UNKNOWN is for insufficient information, ambiguity, conflict, or missing context. OTHER is not an uncertainty fallback. Choose by primary purpose, not isolated keywords; technology event reporting is NEWS, technology explanation is TECH, and entertainment announcements/releases are ENTERTAINMENT. Do not infer facts. Return JSON only using the label schema." },
        { role: "user", content: JSON.stringify({ id: content.id, source: content.source, text: content.text }) }
      ]
    });
    console.info("[ollama] before fetch", {
      signalAborted: controller.signal.aborted,
      timeoutMs: this.timeoutMs,
      resolvedUrl: new URL(url, globalThis.location?.href ?? "http://localhost/").href,
      method: "POST",
      body: requestBody
    });
    try {
      console.info("[checkpoint-10] fetch invoked", { url });
      const promise = this.fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: requestBody
      });
      console.info("[ollama] fetch returned promise");
      const response = await promise;
      console.info("[ollama] HTTP status", { url, status: response.status });
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const payload = await response.json() as { message?: { content?: unknown } };
      console.info("[ollama] response received", { url, contentId: content.id });
      if (typeof payload.message?.content !== "string") throw new Error("Missing Ollama message content");
      return payload.message.content;
    } catch (error) {
      console.error("[ollama] caught error", { url, contentId: content.id, error });
      if (error instanceof DOMException && error.name === "AbortError") throw new OllamaTimeoutError();
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
