import { readFile, writeFile } from "node:fs/promises";
import { RuleClassifier } from "../src/classification/rule-classifier.js";
import { LLMClassifier } from "../src/classification/llm-classifier.js";
import { HybridClassifier } from "../src/classification/hybrid-classifier.js";
import { OllamaClient } from "../src/llm/ollama-client.js";
import type { ClassificationLabel, Classifier, ContentRecord } from "../src/classification/contracts.js";

type Case = { id: string; text: string; expectedLabel: ClassificationLabel };
const labels: ClassificationLabel[] = ["TECH", "NEWS", "ENTERTAINMENT", "OTHER", "UNKNOWN"];
const cases = JSON.parse(await readFile("testdata/holdout-cases.json", "utf8")) as Case[];
const refs = JSON.parse(await readFile("reports/holdout-reference-labels.json", "utf8")) as Array<{id:string;label:ClassificationLabel}>;
const expected = new Map(refs.map((r) => [r.id, r.label]));
if (cases.length !== 50 || new Set(cases.map(c => c.id)).size !== 50) throw new Error("invalid holdout");
const rule = new RuleClassifier({ tech: [/compiler|kernel|database|web|api|static|developer|open-source|inference|frontend|software|code/i], news: [/authority|newspaper|official|bulletin|journalist|notice|press|correspondent|report|announcement/i], entertainment: [/streaming|concert|game|film|theater|singer|critic|esports|art|comedian/i], other: [/neighborhood|bakery|resident|community|market|club|cafe|library|directions|apartment/i] });
const llm = new LLMClassifier(new OllamaClient({ baseUrl: "http://localhost:11434", model: "mistral:latest", timeoutMs: 60000 }));
const hybrid = new HybridClassifier(rule, llm);
const record = (c: Case): ContentRecord => ({ id: c.id, text: c.text, source: "holdout", insertedAt: Date.now() });
async function run(name: string, classifier: Classifier) {
  const rows: any[] = []; const wall = performance.now();
  for (const c of cases) { const started = performance.now(); let result; try { result = await classifier.classify(record(c)); } catch { result = { label:"UNKNOWN", strategy:"llm-only", latencyMs:performance.now()-started, llmCalled:true, reason:"runtime-error" }; } rows.push({ id:c.id, expected:expected.get(c.id), label:result.label, strategy:result.strategy, llmCalled:result.llmCalled, latencyMs:result.latencyMs, reason:result.reason }); }
  const metrics = score(rows, performance.now()-wall); return { name, ...metrics, rows };
}
function score(rows:any[], wall:number) { const n=rows.length; const matrix:any=Object.fromEntries(labels.map(e=>[e,Object.fromEntries(labels.map(p=>[p,0]))])); for(const r of rows) matrix[r.expected][r.label]++;
  const perClass:any={}; for(const l of labels){const tp=matrix[l][l], fp=labels.reduce((s,e)=>s+matrix[e][l],0)-tp, fn=labels.reduce((s,e)=>s+matrix[l][e],0)-tp; const precision=tp+fp?tp/(tp+fp):0, recall=tp+fn?tp/(tp+fn):0; perClass[l]={precision,recall,f1:precision+recall?2*precision*recall/(precision+recall):0,support:tp+fn};}
  const lat=rows.map(r=>r.latencyMs).sort((a,b)=>a-b); const pct=(p:number)=>lat[Math.min(n-1,Math.floor(n*p))]??0; return { cases:n, accuracy:rows.filter(r=>r.label===r.expected).length/n, macroF1:labels.reduce((s,l)=>s+perClass[l].f1,0)/labels.length, perClass, confusionMatrix:matrix, unknownRate:rows.filter(r=>r.label==="UNKNOWN").length/n, invalidOrErrorRate:rows.filter(r=>r.reason).length/n, llmCalls:rows.filter(r=>r.llmCalled).length, llmCallRate:rows.filter(r=>r.llmCalled).length/n, meanLatencyMs:lat.reduce((s,v)=>s+v,0)/n, medianLatencyMs:pct(.5), p95LatencyMs:pct(.95), totalWallClockMs:wall };
}
const results = { generatedAt:new Date().toISOString(), source:"independent holdout", caseCount:50, models:{ rule:await run("Rule",rule), mistral:await run("Revised Mistral 7B",llm), hybrid:await run("Hybrid",hybrid) } };
const old = JSON.parse(await readFile("reports/evaluation-report.json", "utf8")); old.holdout = results; await writeFile("reports/holdout-report.json", JSON.stringify(results,null,2)+"\n"); await writeFile("reports/evaluation-report.json", JSON.stringify(old,null,2)+"\n"); console.log(JSON.stringify(results.models, null, 2));
