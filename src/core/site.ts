import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".svg",
  ".txt",
  ".xml",
  ".map",
]);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".tif",
  ".tiff",
  ".bmp",
]);

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git"]);

const REFERENCE_EXTENSIONS = ["webp", "avif", "png", "jpg", "jpeg"];

const IMAGE_REFERENCE =
  /([A-Za-z0-9_@%+~.,/\-]+)\.(jpe?g|png|gif|tiff?|bmp)(?=(["')\s?#>]|$))/gi;

export interface CopySiteOptions {
  rootDir: string;
  outputDir: string;
  analyzed: Set<string>;
  optimized: Set<string>;
}

export interface CopySiteResult {
  copiedFiles: number;
  rewrittenFiles: number;
  rewrittenReferences: number;
}

interface RewriteResult {
  content: string;
  replacements: number;
}

export function rewriteImageReferences(
  content: string,
  textRelativePath: string,
  outputDir: string,
): RewriteResult {
  const textDirectory = dirname(textRelativePath);
  let replacements = 0;

  const rewritten = content.replace(
    IMAGE_REFERENCE,
    (full: string, rawPath: string, extension: string) => {
      if (
        rawPath.includes("://") ||
        rawPath.startsWith("//") ||
        rawPath.startsWith("data:")
      ) {
        return full;
      }

      const referenceDirectory = rawPath.startsWith("/")
        ? ""
        : textDirectory;
      const relativeReference = rawPath.startsWith("/")
        ? rawPath.slice(1)
        : join(referenceDirectory, rawPath);
      const outputReference = resolve(outputDir, relativeReference);
      const withoutExtension = outputReference.slice(
        0,
        outputReference.length - extname(outputReference).length,
      );
      const current = extension.toLowerCase();

      for (const candidate of REFERENCE_EXTENSIONS) {
        const sameFormat =
          candidate === current ||
          (candidate === "jpg" && current === "jpeg") ||
          (candidate === "jpeg" && current === "jpg");

        if (sameFormat) {
          continue;
        }

        if (existsSync(`${withoutExtension}.${candidate}`)) {
          replacements += 1;
          return `${rawPath}.${candidate}`;
        }
      }

      return full;
    },
  );

  return { content: rewritten, replacements };
}

async function walk(
  currentDirectory: string,
  options: CopySiteOptions,
  result: CopySiteResult,
): Promise<void> {
  const entries = await readdir(currentDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(currentDirectory, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const resolved = resolve(sourcePath);
      if (
        resolved === options.outputDir ||
        resolved.startsWith(options.outputDir + sep)
      ) {
        continue;
      }

      await walk(sourcePath, options, result);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const absoluteSource = resolve(sourcePath);
    if (options.optimized.has(absoluteSource)) {
      continue;
    }

    const relativePath = relative(options.rootDir, sourcePath);
    const destinationPath = join(options.outputDir, relativePath);
    const extension = extname(sourcePath).toLowerCase();

    if (TEXT_EXTENSIONS.has(extension)) {
      const original = await readFile(sourcePath, "utf8");
      const { content, replacements } = rewriteImageReferences(
        original,
        relativePath,
        options.outputDir,
      );

      await mkdir(dirname(destinationPath), { recursive: true });
      await writeFile(destinationPath, content);
      result.copiedFiles += 1;

      if (replacements > 0) {
        result.rewrittenFiles += 1;
        result.rewrittenReferences += replacements;
      }

      continue;
    }

    if (IMAGE_EXTENSIONS.has(extension)) {
      if (!options.analyzed.has(absoluteSource)) {
        continue;
      }

      if (existsSync(destinationPath)) {
        continue;
      }

      await mkdir(dirname(destinationPath), { recursive: true });
      await copyFile(sourcePath, destinationPath);
      result.copiedFiles += 1;
      continue;
    }

    if (existsSync(destinationPath)) {
      continue;
    }

    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
    result.copiedFiles += 1;
  }
}

export async function copyStaticSite(
  options: CopySiteOptions,
): Promise<CopySiteResult> {
  const result: CopySiteResult = {
    copiedFiles: 0,
    rewrittenFiles: 0,
    rewrittenReferences: 0,
  };

  await walk(resolve(options.rootDir), {
    ...options,
    rootDir: resolve(options.rootDir),
    outputDir: resolve(options.outputDir),
  }, result);

  return result;
}
