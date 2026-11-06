import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { urlToFilePath } from "../src/utils/url.js";

const directories: string[] = [];

async function fixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "viewfit-"));
  directories.push(directory);
  await writeFile(join(directory, "image.png"), "placeholder");
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("urlToFilePath", () => {
  it("maps same-origin URLs to files inside the root", async () => {
    const root = await fixture();
    expect(
      urlToFilePath("http://localhost:3000/image.png", root, "http://localhost:3000/"),
    ).toBe(join(root, "image.png"));
  });

  it("ignores query strings and hashes", async () => {
    const root = await fixture();
    expect(
      urlToFilePath(
        "http://localhost:3000/image.png?v=2#hash",
        root,
        "http://localhost:3000/",
      ),
    ).toBe(join(root, "image.png"));
  });

  it("rejects other origins and missing files", async () => {
    const root = await fixture();
    expect(
      urlToFilePath("https://cdn.example.com/image.png", root, "http://localhost:3000/"),
    ).toBeNull();
    expect(
      urlToFilePath("http://localhost:3000/missing.png", root, "http://localhost:3000/"),
    ).toBeNull();
  });

  it("rejects path traversal", async () => {
    const root = await fixture();
    expect(
      urlToFilePath(
        "http://localhost:3000/%252e%252e/image.png",
        root,
        "http://localhost:3000/",
      ),
    ).toBeNull();
  });
});
