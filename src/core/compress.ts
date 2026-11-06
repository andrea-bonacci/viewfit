import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import type { ImageAnalysis, OutputFormat } from "../types.js";
import { encodeImage, extensionFor } from "./encode.js";

export interface CompressOptions {
  format: OutputFormat;
  quality: number;
  outputDir: string;
  write: boolean;
  rootDir: string | null;
}

export interface CompressResult {
  input: string;
  output: string;
  bytes: number;
  mode: "overwrite" | "output" | "skipped";
}

function outputPathFor(
  analysis: ImageAnalysis,
  options: CompressOptions,
): string {
  const source = analysis.filePath as string;
  const relativePath = options.rootDir
    ? relative(options.rootDir, source)
    : basename(source);
  const extension = extensionFor(options.format, analysis.originalFormat);
  const withoutExtension = relativePath.replace(/\.[^./\\]+$/, "");
  return join(options.outputDir, `${withoutExtension}.${extension}`);
}

export async function compressImage(
  analysis: ImageAnalysis,
  options: CompressOptions,
): Promise<CompressResult> {
  if (!analysis.filePath || !analysis.recommended) {
    return {
      input: analysis.filePath ?? analysis.url,
      output: "",
      bytes: 0,
      mode: "skipped",
    };
  }

  const buffer = await encodeImage(
    analysis.filePath,
    analysis.targetWidth,
    analysis.targetHeight,
    {
      format: options.format,
      quality: options.quality,
      originalFormat: analysis.originalFormat,
    },
  );

  if (options.write) {
    const temporaryPath = `${analysis.filePath}.viewfit-${process.pid}.tmp`;
    await writeFile(temporaryPath, buffer);
    await rename(temporaryPath, analysis.filePath);

    return {
      input: analysis.filePath,
      output: analysis.filePath,
      bytes: buffer.length,
      mode: "overwrite",
    };
  }

  const outputPath = outputPathFor(analysis, options);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return {
    input: analysis.filePath,
    output: outputPath,
    bytes: buffer.length,
    mode: "output",
  };
}
