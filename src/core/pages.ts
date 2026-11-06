import { readdir } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

const HTML_EXTENSIONS = new Set([".html", ".htm"]);
const IGNORED_DIRECTORIES = new Set(["node_modules", ".git"]);

export interface FindHtmlOptions {
  exclude?: string[];
}

export async function findHtmlFiles(
  rootDir: string,
  options: FindHtmlOptions = {},
): Promise<string[]> {
  const root = resolve(rootDir);
  const excluded = (options.exclude ?? [])
    .map((path) => resolve(path))
    .filter((path) => path !== root);
  const results: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        const resolved = resolve(fullPath);
        if (
          excluded.some(
            (path) => resolved === path || resolved.startsWith(path + sep),
          )
        ) {
          continue;
        }

        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && HTML_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  await walk(root);
  return results.sort();
}
