import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";

export function urlToFilePath(
  url: string,
  rootDir: string,
  pageUrl: string,
): string | null {
  let parsed: URL;
  let base: URL;

  try {
    parsed = new URL(url);
    base = new URL(pageUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== base.origin) {
    return null;
  }

  const root = resolve(rootDir);
  const relativePath = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");

  if (relativePath === "" || relativePath.includes("\0")) {
    return null;
  }

  const filePath = resolve(root, relativePath);

  if (filePath !== root && !filePath.startsWith(root + sep)) {
    return null;
  }

  return existsSync(filePath) ? filePath : null;
}
