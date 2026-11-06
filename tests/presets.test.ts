import { describe, expect, it } from "vitest";
import { getPreset, PRESETS } from "../src/config/presets.js";

describe("presets", () => {
  it("returns known presets case-insensitively", () => {
    expect(getPreset("WEB").format).toBe("webp");
    expect(getPreset("hq").device).toBe("desktop");
  });

  it("rejects unknown presets", () => {
    expect(() => getPreset("nope")).toThrow();
  });

  it("defines all documented presets", () => {
    expect(Object.keys(PRESETS).sort()).toEqual(["fast", "hq", "web"]);
  });
});
