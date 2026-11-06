import { describe, expect, it } from "vitest";
import { requiredScale } from "../src/core/recommend.js";

describe("requiredScale", () => {
  it("uses the cover ratio and never upscales", () => {
    expect(requiredScale("cover", 800, 300, 1920, 1080, 1)).toBeCloseTo(0.4167, 3);
    expect(requiredScale("cover", 4000, 3000, 1920, 1080, 1)).toBe(1);
  });

  it("uses the contain ratio", () => {
    expect(requiredScale("contain", 800, 300, 1920, 1080, 1)).toBeCloseTo(
      0.2778,
      3,
    );
  });

  it("accounts for device pixel ratio", () => {
    expect(requiredScale("fill", 600, 400, 2400, 1600, 2)).toBe(0.5);
  });

  it("keeps natural size for auto and none backgrounds", () => {
    expect(requiredScale("auto", 100, 100, 2000, 2000, 3)).toBe(1);
    expect(requiredScale("none", 100, 100, 2000, 2000, 3)).toBe(1);
  });
});
