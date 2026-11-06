import { stat } from "node:fs/promises";
import sharp from "sharp";

export interface ImageMetadata {
  width: number;
  height: number;
  format: string | null;
  bytes: number;
}

export async function readImageMetadata(
  filePath: string,
): Promise<ImageMetadata> {
  const [metadata, fileInfo] = await Promise.all([
    sharp(filePath).metadata(),
    stat(filePath),
  ]);

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions.");
  }

  const swapped =
    typeof metadata.orientation === "number" && metadata.orientation >= 5;

  return {
    width: swapped ? metadata.height : metadata.width,
    height: swapped ? metadata.width : metadata.height,
    format: metadata.format ?? null,
    bytes: fileInfo.size,
  };
}
