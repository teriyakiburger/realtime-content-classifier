import { describe, expect, it, vi } from "vitest";
import { runSequential } from "../src/evaluation/sequential-runner.js";

describe("sequential evaluation runner", () => {
  it("waits for terminal completion before inserting the next case", async () => {
    const events: string[] = [];
    let complete!: () => void;
    const result = runSequential({
      cases: [{ input: "a", model: "gemma3:1b" }, { input: "b", model: "gemma3:1b" }],
      insert: (input) => { events.push(`insert:${input}`); return input; },
      waitForTerminal: async (id) => {
        events.push(`wait:${id}`);
        if (id === "a") await new Promise<void>((resolve) => { complete = resolve; });
        events.push(`done:${id}`);
        return { label: "TECH", latencyMs: 1 };
      },
      timeoutMs: 100
    });
    await Promise.resolve();
    expect(events).toEqual(["insert:a", "wait:a"]);
    complete();
    await expect(result).resolves.toHaveLength(2);
    expect(events).toEqual(["insert:a", "wait:a", "done:a", "insert:b", "wait:b", "done:b"]);
  });

  it("continues after a timeout/error", async () => {
    const inserted: string[] = [];
    const results = await runSequential({
      cases: [{ input: "slow", model: "gemma3:4b" }, { input: "next", model: "gemma3:4b" }],
      insert: (input) => { inserted.push(input); return input; },
      waitForTerminal: async (id) => { if (id === "slow") throw new Error("case timeout"); return { label: "NEWS" }; },
      timeoutMs: 1
    });
    expect(inserted).toEqual(["slow", "next"]);
    expect(results[0].error).toBe("case timeout");
    expect(results[1].result).toEqual({ label: "NEWS" });
  });

  it("does not start a case while the previous inference is active", async () => {
    const active = vi.fn();
    let resolve!: () => void;
    const run = runSequential({
      cases: [{ input: "one", model: "m" }, { input: "two", model: "m" }],
      insert: (input) => { active(input); return input; },
      waitForTerminal: async (id) => { if (id === "one") await new Promise<void>((r) => { resolve = r; }); return {}; },
      timeoutMs: 100
    });
    await Promise.resolve();
    expect(active).toHaveBeenCalledTimes(1);
    resolve();
    await run;
    expect(active).toHaveBeenCalledTimes(2);
  });
});
