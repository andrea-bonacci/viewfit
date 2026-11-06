import sharp, { type Sharp } from "sharp";
import type { OutputFormat } from "../types.js";

export interface EncodeOptions {
  format: OutputFormat;
  quality: number;
  originalFormat: string | null;
}

export function extensionFor(
  format: OutputFormat,
  originalFormat: string | null,
): string {
  const target = format === "original" ? originalFormat ?? "jpg" : format;
  return target === "jpeg" ? "jpg" : target;
}

function applyFormat(pipeline: Sharp, options: EncodeOptions): Sharp {
  const target =
    options.format === "original" ? options.originalFormat : options.format;
  const quality = options.quality;

  switch (target) {
    case "jpeg":
    case "jpg":
      return pipeline.jpeg({ quality, mozjpeg: true });
    case "png":
      return pipeline.png({ compressionLevel: 9 });
    case "webp":
      return pipeline.webp({ quality });
    case "avif":
      return pipeline.avif({ quality });
    case "gif":
      return pipeline.gif();
    default:
      return pipeline;
  }
}

export async function encodeImage(
  input: string,
  width: number,
  height: number,
  options: EncodeOptions,
): Promise<Buffer> {
  const pipeline = sharp(input)
    .rotate()
    .resize({
      width,
      height,
      fit: "inside",
      withoutEnlargement: true,
    });

  return applyFormat(pipeline, options).toBuffer();
}

export async function estimateEncodedSize(
  input: string,
  width: number,
  height: number,
  options: EncodeOptions,
): Promise<number | null> {
  try {
    const buffer = await encodeImage(input, width, height, options);
    return buffer.length;
  } catch {
    return null;
  }
}
