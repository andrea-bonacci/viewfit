import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findHtmlFiles } from "../src/core/pages.js";

const directories: string[] = [];

async function fixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "viewfit-pages-"));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("findHtmlFiles", () => {
  it("finds HTML files recursively and sorts them", async () => {
    const root = await fixture();
    await mkdir(join(root, "pages"), { recursive: true });
    await writeFile(join(root, "index.html"), "");
    await writeFile(join(root, "about.htm"), "");
    await writeFile(join(root, "pages", "contact.html"), "");
    await writeFile(join(root, "styles.css"), "");

    expect(await findHtmlFiles(root)).toEqual([
      join(root, "about.htm"),
      join(root, "index.html"),
      join(root, "pages", "contact.html"),
    ]);
  });

  it("ignores node_modules, .git and excluded folders", async () => {
    const root = await fixture();
    await mkdir(join(root, "node_modules"), { recursive: true });
    await mkdir(join(root, ".git"), { recursive: true });
    await mkdir(join(root, "output"), { recursive: true });
    await writeFile(join(root, "index.html"), "");
    await writeFile(join(root, "node_modules", "index.html"), "");
    await writeFile(join(root, ".git", "index.html"), "");
    await writeFile(join(root, "output", "index.html"), "");

    expect(await findHtmlFiles(root, { exclude: [join(root, "output")] })).toEqual([
      join(root, "index.html"),
    ]);
  });
});
