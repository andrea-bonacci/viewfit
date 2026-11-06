import type {
  AnalyzeOptions,
  CollectedImage,
  ImageAnalysis,
  ImageContext,
  ImageFit,
} from "../types.js";
import { urlToFilePath } from "../utils/url.js";
import { estimateEncodedSize } from "./encode.js";
import { readImageMetadata } from "./metadata.js";

export function requiredScale(
  fit: ImageFit,
  cssWidth: number,
  cssHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  dpr: number,
): number {
  const widthRatio = (cssWidth * dpr) / naturalWidth;
  const heightRatio = (cssHeight * dpr) / naturalHeight;

  switch (fit) {
    case "contain":
    case "scale-down":
      return Math.min(widthRatio, heightRatio, 1);
    case "none":
    case "auto":
      return 1;
    case "cover":
    case "fill":
    default:
      return Math.min(Math.max(widthRatio, heightRatio), 1);
  }
}

function groupByUrl(images: CollectedImage[]): Map<string, ImageContext[]> {
  const groups = new Map<string, ImageContext[]>();

  for (const image of images) {
    const contexts = groups.get(image.src) ?? [];
    contexts.push({
      kind: image.kind,
      cssWidth: image.cssWidth,
      cssHeight: image.cssHeight,
      fit: image.fit,
      selector: image.selector,
    });
    groups.set(image.src, contexts);
  }

  return groups;
}

function emptyAnalysis(
  url: string,
  contexts: ImageContext[],
  options: AnalyzeOptions,
  reason: string,
): ImageAnalysis {
  const renderedWidth = Math.max(...contexts.map((context) => context.cssWidth));
  const renderedHeight = Math.max(
    ...contexts.map((context) => context.cssHeight),
  );

  return {
    url,
    filePath: null,
    originalWidth: 0,
    originalHeight: 0,
    originalBytes: 0,
    originalFormat: null,
    renderedWidth,
    renderedHeight,
    contexts,
    targetWidth: Math.max(
      1,
      Math.round(renderedWidth * options.dpr * options.tierScale),
    ),
    targetHeight: Math.max(
      1,
      Math.round(renderedHeight * options.dpr * options.tierScale),
    ),
    estimatedBytes: null,
    savingsBytes: null,
    savingsPercent: null,
    transformable: false,
    recommended: false,
    reason,
  };
}

export async function analyzeImages(
  images: CollectedImage[],
  options: AnalyzeOptions,
): Promise<ImageAnalysis[]> {
  const groups = groupByUrl(images);
  const analyses: ImageAnalysis[] = [];

  for (const [url, contexts] of groups) {
    const filePath = options.rootDir
      ? urlToFilePath(url, options.rootDir, options.pageUrl)
      : null;

    if (!filePath) {
      analyses.push(
        emptyAnalysis(
          url,
          contexts,
          options,
          options.rootDir
            ? "File not found under the project root (remote or generated asset)."
            : "No local root provided; reporting only.",
        ),
      );
      continue;
    }

    let metadata;
    try {
      metadata = await readImageMetadata(filePath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to read image.";
      analyses.push(emptyAnalysis(url, contexts, options, message));
      continue;
    }

    const scale = contexts.reduce(
      (current, context) =>
        Math.max(
          current,
          requiredScale(
            context.fit,
            context.cssWidth,
            context.cssHeight,
            metadata.width,
            metadata.height,
            options.dpr,
          ),
        ),
      0,
    );

    const targetWidth = Math.max(
      1,
      Math.min(
        metadata.width,
        Math.round(metadata.width * scale * options.tierScale),
      ),
    );
    const targetHeight = Math.max(
      1,
      Math.min(
        metadata.height,
        Math.round(metadata.height * scale * options.tierScale),
      ),
    );

    const renderedWidth = Math.max(
      ...contexts.map((context) => context.cssWidth),
    );
    const renderedHeight = Math.max(
      ...contexts.map((context) => context.cssHeight),
    );

    const resizeNeeded =
      targetWidth < metadata.width || targetHeight < metadata.height;
    const formatChanges =
      options.format !== "original" &&
      options.format !== (metadata.format ?? undefined);

    let estimatedBytes: number | null = null;
    const willTransform = resizeNeeded || formatChanges;

    if (willTransform && options.estimate) {
      estimatedBytes = await estimateEncodedSize(
        filePath,
        targetWidth,
        targetHeight,
        {
          format: options.format,
          quality: options.quality,
          originalFormat: metadata.format,
        },
      );
    }

    const savingsBytes =
      estimatedBytes === null ? null : metadata.bytes - estimatedBytes;
    const savingsPercent =
      savingsBytes === null || metadata.bytes === 0
        ? null
        : (savingsBytes / metadata.bytes) * 100;

    analyses.push({
      url,
      filePath,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      originalBytes: metadata.bytes,
      originalFormat: metadata.format,
      renderedWidth,
      renderedHeight,
      contexts,
      targetWidth,
      targetHeight,
      estimatedBytes,
      savingsBytes,
      savingsPercent,
      transformable: willTransform,
      recommended:
        willTransform && estimatedBytes !== null && estimatedBytes < metadata.bytes,
      reason: willTransform
        ? undefined
        : "Already at or below the rendered size.",
    });
  }

  return analyses;
}
