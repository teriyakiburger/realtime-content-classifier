import { LLMClassifier } from "../src/classification/llm-classifier.js";
import { OllamaClient } from "../src/llm/ollama-client.js";

const classifier = new LLMClassifier(new OllamaClient({
  baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  model: "gemma4:12b",
  timeoutMs: 60_000
}));

const startedAt = performance.now();
const result = await classifier.classify({
  id: "integration-001",
  source: "local integration fixture",
  text: "A local report about TypeScript tooling and software development.",
  insertedAt: Date.now()
});

console.log(JSON.stringify({ ...result, wallClockLatencyMs: Math.round(performance.now() - startedAt) }, null, 2));
if (result.label === "UNKNOWN") process.exitCode = 1;
