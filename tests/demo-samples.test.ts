import { describe, expect, it } from "vitest";
import { RuleClassifier } from "../src/classification/rule-classifier.js";
import { createDemoSamplePicker, demoSamples } from "../src/demo-samples.js";

describe("demo sample pool", () => {
  it("contains both Rule-resolved and natural fallback samples", () => {
    const rule = new RuleClassifier({
      tech: [/typescript|javascript|software|code/i],
      news: [/headline|breaking|report/i],
      entertainment: [/movie|music|game|trailer/i],
      other: [/welcome|local demo|community/i]
    });
    const labels = demoSamples.map(([title, , description], i) => rule.classify({ id: String(i), text: `${title} ${description}`, source: "demo", insertedAt: 0 }).label);
    expect(demoSamples.length).toBeGreaterThanOrEqual(30);
    expect(demoSamples.length).toBeLessThanOrEqual(50);
    expect(new Set(demoSamples.map(([title]) => title)).size).toBe(demoSamples.length);
    expect(labels.filter((label) => label === "TECH").length).toBeGreaterThan(0);
    expect(labels.filter((label) => label === "NEWS").length).toBeGreaterThan(0);
    expect(labels.filter((label) => label === "ENTERTAINMENT").length).toBeGreaterThan(0);
    expect(labels.filter((label) => label === "OTHER").length).toBeGreaterThan(0);
    expect(labels.filter((label) => label === "UNKNOWN").length).toBeGreaterThan(0);
    expect(labels.filter((label) => label === "UNKNOWN").length).toBeLessThan(labels.length / 2);
  });

  it("can reach both resolved and fallback candidates without immediate repeats", () => {
    const picker = createDemoSamplePicker(() => 0.42);
    const picked = Array.from({ length: demoSamples.length }, () => picker());
    expect(new Set(picked).size).toBe(demoSamples.length);
    expect(picked.some((sample) => sample[0] === "TypeScript release notes")).toBe(true);
    expect(picked.some((sample) => sample[0] === "A short update")).toBe(true);
    expect(picked.every((sample, index) => index === 0 || sample !== picked[index - 1])).toBe(true);
    expect(picked.slice(0, 8).map((sample) => sample[0]).join("|")).not.toBe(picked.slice(8, 16).map((sample) => sample[0]).join("|"));
  });
});
