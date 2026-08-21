import { describe, expect, it } from "vitest";

describe("project specification", () => {
  it("starts with a testable baseline", () => {
    expect(process.env.NODE_ENV ?? "test").toBeDefined();
  });
});
