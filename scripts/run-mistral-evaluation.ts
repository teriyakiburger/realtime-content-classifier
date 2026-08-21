import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import type { ClassificationLabel } from "../src/classification/contracts.js";

type Case = { id: string; text: string; expectedLabel: ClassificationLabel };
type Row = { id: string; input: string; expected: ClassificationLabel; label: ClassificationLabel; latencyMs: number; error?: string; invalidStructuredOutput?: boolean };
const labels: ClassificationLabel[] = ["TECH", "NEWS", "ENTERTAINMENT", "OTHER", "UNKNOWN"];
const model = "mistral:latest";
const endpoint = "http://localhost:11434/api/chat";

function p95(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] ?? 0; }
function detailed(rows: Row[]) {
  const matrix = Object.fromEntries(labels.map((actual) => [actual, Object.fromEntries(labels.map((predicted) => [predicted, 0]))])) as Record<ClassificationLabel, Record<ClassificationLabel, number>>;
  for (const row of rows) matrix[row.expected][row.label] += 1;
  const perClass = Object.fromEntries(labels.map((label) => {
    const tp = matrix[label][label]; const fp = labels.reduce((n, actual) => n + (actual === label ? 0 : matrix[actual][label]), 0); const fn = labels.reduce((n, predicted) => n + (predicted === label ? 0 : matrix[label][predicted]), 0);
    const precision = tp + fp ? tp / (tp + fp) : 0; const recall = tp + fn ? tp / (tp + fn) : 0; const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    return [label, { precision, recall, f1, support: tp + fn }];
  }));
  const latencies = rows.map((x) => x.latencyMs);
  return { accuracy: rows.filter((x) => x.label === x.expected).length / rows.length, macroF1: labels.reduce((n, label) => n + (perClass as any)[label].f1, 0) / labels.length, perClass, confusionMatrix: matrix, unknownRate: rows.filter((x) => x.label === "UNKNOWN").length / rows.length, invalidStructuredOutputRate: rows.filter((x) => x.invalidStructuredOutput).length / rows.length, timeoutErrorRate: rows.filter((x) => x.error).length / rows.length, meanLatencyMs: latencies.reduce((a, b) => a + b, 0) / rows.length, medianLatencyMs: [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)] ?? 0, p95LatencyMs: p95(latencies), totalInferenceTimeMs: latencies.reduce((a, b) => a + b, 0), llmCalls: rows.length, cases: rows.length };
}

async function run(cases: Case[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (const item of cases) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 60_000); const started = performance.now();
    try {
      const schema = { type: "object", properties: { label: { type: "string", enum: labels } }, required: ["label"], additionalProperties: false };
      const prompt = `You are a strict content classifier.
Classify the provided content into exactly one of: TECH, NEWS, ENTERTAINMENT, OTHER, UNKNOWN.

TECH: Primarily about software, programming, AI, computing, hardware, cybersecurity, cloud infrastructure, developer tools, engineering, technical products, or explaining technology.
NEWS: Primarily reporting timely real-world events or developments, including politics, economics, business developments, policy, public affairs, incidents, company announcements, and current events.
ENTERTAINMENT: Primarily about movies, television, music, games, celebrities, anime, trailers, releases, reviews, performances, or pop culture.
OTHER: Use only when the topic is clearly identifiable but genuinely belongs to none of TECH, NEWS, or ENTERTAINMENT.
UNKNOWN: Use when there is not enough reliable information, or content is genuinely ambiguous, underspecified, conflicting, or lacks context.

Rules: OTHER is not an uncertainty fallback. If evidence is insufficient, use UNKNOWN. Choose based on the primary purpose, not isolated keywords. Technology-related current-event reporting is NEWS; technology explanation is TECH. Entertainment announcements, releases, trailers, reviews, and performances are ENTERTAINMENT. Do not infer facts not present.
Return JSON only using the requested schema.`;
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model, stream: false, format: schema, messages: [{ role: "system", content: prompt }, { role: "user", content: item.text }] }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { message?: { content?: string } }; const parsed = JSON.parse(payload.message?.content ?? "") as { label?: string };
      if (!labels.includes(parsed.label as ClassificationLabel)) throw Object.assign(new Error("invalid structured label"), { invalidStructuredOutput: true });
      rows.push({ id: item.id, input: item.text, expected: item.expectedLabel, label: parsed.label as ClassificationLabel, latencyMs: performance.now() - started });
    } catch (error) { rows.push({ id: item.id, input: item.text, expected: item.expectedLabel, label: "UNKNOWN", latencyMs: performance.now() - started, error: error instanceof Error ? error.message : String(error), ...(error && typeof error === "object" && "invalidStructuredOutput" in error ? { invalidStructuredOutput: true } : {}) }); }
    finally { clearTimeout(timer); }
  }
  return rows;
}

const report = JSON.parse(await readFile("reports/evaluation-report.json", "utf8")) as any;
if (!report.mistralBaseline) report.mistralBaseline = report.mistral;
const cases = JSON.parse(await readFile("testdata/evaluation-cases.json", "utf8")) as Case[];
const latencyCases = cases.filter((_, index) => index % 20 < 8);
const rows = await run(cases); const sequentialRows = await run(latencyCases);
const revised = { model, promptVariant: "revised-taxonomy-rules", evaluation: detailed(rows), sequential: detailed(sequentialRows), rows, sequentialRows };
report.mistralRevisedPrompt = revised;
const baseline = report.mistralBaseline;
const transition = (from: any, actual: ClassificationLabel, predicted: ClassificationLabel) => from.evaluation.confusionMatrix[actual][predicted];
report.promptComparison = {
  baseline: baseline.evaluation,
  revised: revised.evaluation,
  changes: {
    "UNKNOWN -> OTHER": [transition(baseline, "UNKNOWN", "OTHER"), transition(revised, "UNKNOWN", "OTHER")],
    "NEWS -> OTHER": [transition(baseline, "NEWS", "OTHER"), transition(revised, "NEWS", "OTHER")],
    "TECH -> OTHER": [transition(baseline, "TECH", "OTHER"), transition(revised, "TECH", "OTHER")],
    unknownRecall: [baseline.evaluation.perClass.UNKNOWN.recall, revised.evaluation.perClass.UNKNOWN.recall],
    otherPrecision: [baseline.evaluation.perClass.OTHER.precision, revised.evaluation.perClass.OTHER.precision],
    accuracy: [baseline.evaluation.accuracy, revised.evaluation.accuracy],
    macroF1: [baseline.evaluation.macroF1, revised.evaluation.macroF1]
  }
};
report.mistral = revised;
report.comparison = { rule: report.initial.models.rule, gemma3_4b: report.initial.models["gemma3:4b"], mistralBaseline: baseline.evaluation, mistralRevisedPrompt: revised.evaluation, question: "Does the revised Mistral prompt improve accuracy or macro-F1 without material regression?" };
await writeFile("reports/evaluation-report.json", JSON.stringify(report, null, 2));
const models = { RuleClassifier: report.initial.models.rule, "Gemma 3 4B": report.initial.models["gemma3:4b"], "Mistral 7B baseline": baseline.evaluation, "Mistral 7B revised prompt": revised.evaluation, "Gemma 3 1B (historical)": report.initial.models["gemma3:1b"] };
const dashboard = `<html><head><meta charset="utf-8"><title>Local classifier evaluation</title><style>body{font:16px system-ui;max-width:1100px;margin:40px auto}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}</style></head><body><h1>Local classifier evaluation</h1><p>Fixed cases: 100. Sequential latency subset: 40. Prompt-only Mistral A/B comparison; no datasets regenerated.</p><table><tr><th>Model</th><th>Accuracy</th><th>Macro-F1</th><th>UNKNOWN</th><th>Mean ms</th><th>Median ms</th><th>P95 ms</th><th>LLM calls</th></tr>${Object.entries(models).map(([name, value]: [string, any]) => `<tr><td>${name}</td><td>${(value.accuracy * 100).toFixed(2)}%</td><td>${(value.macroF1 * 100).toFixed(2)}%</td><td>${(value.unknownRate * 100).toFixed(2)}%</td><td>${value.meanLatencyMs.toFixed(1)}</td><td>${(value.medianLatencyMs ?? value.meanLatencyMs).toFixed(1)}</td><td>${value.p95LatencyMs.toFixed(1)}</td><td>${value.llmCalls}</td></tr>`).join("")}</table><h2>Prompt A/B changes</h2><pre>${JSON.stringify(report.promptComparison, null, 2)}</pre><h2>Mistral revised sequential latency</h2><pre>${JSON.stringify(revised.sequential, null, 2)}</pre></body></html>`;
await writeFile("reports/evaluation-dashboard.html", dashboard);
console.log(JSON.stringify({ model, evaluation: report.mistral.evaluation, sequential: report.mistral.sequential, comparison: report.comparison }, null, 2));
