import { describe, expect, it } from "vitest";
import { parseTier, resolveTierScale } from "../src/core/tiers.js";

describe("tiers", () => {
  it("resolves named presets", () => {
    expect(resolveTierScale("exact")).toBe(1);
    expect(resolveTierScale("safe")).toBe(0.9);
    expect(resolveTierScale("aggressive")).toBe(0.75);
    expect(resolveTierScale("extreme")).toBe(0.5);
  });

  it("parses numeric percentages", () => {
    expect(parseTier("80")).toBe(0.8);
    expect(parseTier("0.8")).toBe(0.8);
    expect(resolveTierScale(80)).toBe(0.8);
    expect(resolveTierScale(0.65)).toBe(0.65);
  });

  it("rejects invalid values", () => {
    expect(() => parseTier("nope")).toThrow();
    expect(() => parseTier("0")).toThrow();
    expect(() => resolveTierScale(-1)).toThrow();
  });
});
