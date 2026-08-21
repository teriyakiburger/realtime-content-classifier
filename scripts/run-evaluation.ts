import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { RuleClassifier } from "../src/classification/rule-classifier.js";
import type { ClassificationLabel, ContentRecord } from "../src/classification/contracts.js";

type Case = { id: string; text: string; expectedLabel: ClassificationLabel };
type Observation = { id: string; input: string; expected: ClassificationLabel; label: ClassificationLabel; latencyMs: number; llmCalls: number; error?: string };
const labels: ClassificationLabel[] = ["TECH", "NEWS", "ENTERTAINMENT", "OTHER", "UNKNOWN"];
const endpoint = "http://localhost:11434/api/chat";
const timeoutMs = 60_000;

const rule = new RuleClassifier({
  tech: [/typescript|javascript|software|code|compiler|api|database|developer|programming|browser|server|tool|cloud|library|framework|runtime|endpoint|machine learning/i],
  news: [/headline|report|reporter|news|bulletin|announcement|council|official|journalist|newspaper|policy|election|survey|notice|press|authorities|update/i],
  entertainment: [/movie|trailer|music|game|cinema|film|theater|album|concert|podcast|gallery|orchestra|comedian|animation|festival|dance|streaming/i],
  other: [/community|shop|garden|cafe|library|club|market|resident|park|school|group|office|directory|volunteer|business|center|hours|menu|meeting/i]
});

function record(item: Case): ContentRecord { return { id: item.id, text: item.text, source: "evaluation-fixture", insertedAt: 0 }; }
function p95(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] ?? 0; }
function metrics(rows: Observation) {
  const confusion = new Map<ClassificationLabel, Map<ClassificationLabel, number>>();
  for (const actual of labels) confusion.set(actual, new Map(labels.map((x) => [x, 0])));
  for (const row of rows) confusion.get(row.expected)!.set(row.label, confusion.get(row.expected)!.get(row.label)! + 1);
  const accuracy = rows.filter((x) => x.label === x.expected).length / rows.length;
  const f1 = labels.map((label) => {
    const tp = confusion.get(label)!.get(label)!;
    const fp = labels.reduce((n, x) => n + (x === label ? 0 : confusion.get(x)!.get(label)!), 0);
    const fn = labels.reduce((n, x) => n + (x === label ? 0 : confusion.get(label)!.get(x)!), 0);
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  });
  return { accuracy, macroF1: f1.reduce((a, b) => a + b, 0) / labels.length, unknownRate: rows.filter((x) => x.label === "UNKNOWN").length / rows.length, meanLatencyMs: rows.reduce((n, x) => n + x.latencyMs, 0) / rows.length, p95LatencyMs: p95(rows.map((x) => x.latencyMs)), llmCalls: rows.reduce((n, x) => n + x.llmCalls, 0), cases: rows.length };
}

async function classify(model: string, item: Case): Promise<{ label: ClassificationLabel; latencyMs: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const body = { model, stream: false, format: { type: "object", properties: { label: { type: "string", enum: labels } }, required: ["label"], additionalProperties: false }, messages: [{ role: "system", content: "Return exactly one JSON label from TECH, NEWS, ENTERTAINMENT, OTHER, UNKNOWN." }, { role: "user", content: item.text }] };
  const started = performance.now();
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { message?: { content?: string } };
    const parsed = JSON.parse(payload.message?.content ?? "") as { label?: string };
    if (!labels.includes(parsed.label as ClassificationLabel)) throw new Error("invalid structured label");
    return { label: parsed.label as ClassificationLabel, latencyMs: performance.now() - started };
  } catch (error) {
    return { label: "UNKNOWN", latencyMs: performance.now() - started, error: error instanceof Error ? error.message : String(error) };
  } finally { clearTimeout(timer); }
}

async function evaluateCases(cases: Case[], model?: string): Promise<Observation[]> {
  const rows: Observation[] = [];
  for (const item of cases) {
    if (!model) {
      const started = performance.now(); const result = rule.classify(record(item));
      rows.push({ id: item.id, input: item.text, expected: item.expectedLabel, label: result.label, latencyMs: performance.now() - started, llmCalls: 0 });
    } else {
      const result = await classify(model, item);
      rows.push({ id: item.id, input: item.text, expected: item.expectedLabel, label: result.label, latencyMs: result.latencyMs, llmCalls: 1, ...(result.error ? { error: result.error } : {}) });
    }
  }
  return rows;
}

async function main() {
  const original = JSON.parse(await readFile("testdata/evaluation-cases.json", "utf8")) as Case[];
  await mkdir("reports", { recursive: true });
  const candidates = { rule: await evaluateCases(original), "gemma3:1b": await evaluateCases(original, "gemma3:1b"), "gemma3:4b": await evaluateCases(original, "gemma3:4b") };
  await writeFile("reports/reference-labels.json", JSON.stringify(original.map(({ id, expectedLabel }) => ({ id, label: expectedLabel })), null, 2));
  const summary = (rows: Observation[]) => metrics(rows);
  const initial = { caseCount: original.length, models: Object.fromEntries(Object.entries(candidates).map(([name, rows]) => [name, summary(rows)])), rows: candidates };
  const oneVsFourAccuracy = Math.abs(initial.models["gemma3:1b"].accuracy - initial.models["gemma3:4b"].accuracy) * 100;
  const oneVsFourF1 = Math.abs(initial.models["gemma3:1b"].macroF1 - initial.models["gemma3:4b"].macroF1) * 100;
  const report: Record<string, unknown> = { generatedAt: new Date().toISOString(), decision: { initialAccuracyDifferencePoints: oneVsFourAccuracy, initialMacroF1DifferencePoints: oneVsFourF1, expanded: oneVsFourAccuracy < 5 && oneVsFourF1 < 5 }, initial };
  if (oneVsFourAccuracy < 5 && oneVsFourF1 < 5) {
    const extra: Case[] = labels.flatMap((label) => Array.from({ length: 20 }, (_, i) => ({ id: `expanded-${label.toLowerCase()}-${String(i + 1).padStart(3, "0")}`, text: label === "UNKNOWN" ? `An additional ambiguous local item ${i + 1}.` : `An additional ${label.toLowerCase()} fixture item ${i + 1}.`, expectedLabel: label })));
    const expandedCases = [...original, ...extra];
    await writeFile("testdata/evaluation-cases-expanded.json", JSON.stringify(expandedCases, null, 2));
    const expandedRows = { rule: await evaluateCases(expandedCases), "gemma3:1b": await evaluateCases(expandedCases, "gemma3:1b"), "gemma3:4b": await evaluateCases(expandedCases, "gemma3:4b") };
    report.expandedEvaluation = { caseCount: expandedCases.length, models: Object.fromEntries(Object.entries(expandedRows).map(([name, rows]) => [name, summary(rows)])), rows: expandedRows };
  }
  const latencyCases = original.filter((_, index) => index % 20 < 8);
  const sequential = { caseCount: latencyCases.length, models: { "gemma3:1b": summary(await evaluateCases(latencyCases, "gemma3:1b")), "gemma3:4b": summary(await evaluateCases(latencyCases, "gemma3:4b")) } };
  report.sequentialLatency = sequential;
  await writeFile("reports/evaluation-report.json", JSON.stringify(report, null, 2));
  const finalData = (report.expandedEvaluation as { models?: Record<string, unknown> } | undefined)?.models ?? initial.models;
  const dashboard = `<html><head><meta charset="utf-8"><title>Local classifier evaluation</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}</style></head><body><h1>Local classifier evaluation</h1><p>Cases: ${report.expandedEvaluation ? 200 : 100}</p><table><tr><th>Model</th><th>Accuracy</th><th>Macro-F1</th><th>UNKNOWN</th><th>Mean ms</th><th>P95 ms</th><th>LLM calls</th></tr>${Object.entries(finalData).map(([name, value]) => { const x = value as any; return `<tr><td>${name}</td><td>${(x.accuracy * 100).toFixed(2)}%</td><td>${(x.macroF1 * 100).toFixed(2)}%</td><td>${(x.unknownRate * 100).toFixed(2)}%</td><td>${x.meanLatencyMs.toFixed(1)}</td><td>${x.p95LatencyMs.toFixed(1)}</td><td>${x.llmCalls}</td></tr>`; }).join("")}</table><p>Generated from fixed local fixtures; no third-party content or external APIs.</p></body></html>`;
  await writeFile("reports/evaluation-dashboard.html", dashboard);
  console.log(JSON.stringify({ decision: report.decision, models: finalData, sequential }, null, 2));
}
await main();
