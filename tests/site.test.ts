import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rewriteImageReferences } from "../src/core/site.js";

const directories: string[] = [];

async function fixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "viewfit-site-"));
  directories.push(directory);
  await mkdir(join(directory, "assets"), { recursive: true });
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("rewriteImageReferences", () => {
  it("rewrites references when a converted file exists in the output", async () => {
    const output = await fixture();
    await writeFile(join(output, "assets", "hero.webp"), "x");

    const result = rewriteImageReferences(
      '<img src="assets/hero.jpg"><div style="background:url(assets/hero.jpg)"></div>',
      "index.html",
      output,
    );

    expect(result.replacements).toBe(2);
    expect(result.content).toContain("assets/hero.webp");
    expect(result.content).not.toContain("assets/hero.jpg");
  });

  it("keeps the original reference when no converted file exists", async () => {
    const output = await fixture();
    const result = rewriteImageReferences(
      '<img src="assets/hero.jpg">',
      "index.html",
      output,
    );

    expect(result.replacements).toBe(0);
    expect(result.content).toContain("assets/hero.jpg");
  });

  it("does not touch remote URLs or data URIs", async () => {
    const output = await fixture();
    await writeFile(join(output, "assets", "hero.webp"), "x");

    const source =
      '<img src="https://cdn.example.com/assets/hero.jpg"><img src="data:image/png;base64,abc">';
    const result = rewriteImageReferences(source, "index.html", output);

    expect(result.replacements).toBe(0);
    expect(result.content).toBe(source);
  });

  it("handles root-relative references", async () => {
    const output = await fixture();
    await writeFile(join(output, "assets", "hero.avif"), "x");

    const result = rewriteImageReferences(
      '<img src="/assets/hero.png">',
      "pages/index.html",
      output,
    );

    expect(result.replacements).toBe(1);
    expect(result.content).toContain("/assets/hero.avif");
  });
});
