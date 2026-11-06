import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// The photographic assets are downloaded from Unsplash and committed in assets/.
// This script only regenerates the heavy PNG icon.

const root = dirname(fileURLToPath(import.meta.url));
const assets = join(root, "assets");

function clamp(value) {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

function makeGrainBuffer(width, height, from, to, amplitude, seed) {
  const data = Buffer.allocUnsafe(width * height * 3);
  let state = (seed >>> 0) || 1;

  const random = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };

  let index = 0;

  for (let y = 0; y < height; y += 1) {
    const ny = y / height;
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const wave = 0.09 * Math.sin((nx * 5 + ny * 3) * Math.PI);
      const t = Math.min(1, Math.max(0, ny * 0.68 + nx * 0.32 + wave));
      const grain = (random() * 2 - 1) * amplitude;

      data[index++] = clamp(from[0] + (to[0] - from[0]) * t + grain);
      data[index++] = clamp(from[1] + (to[1] - from[1]) * t + grain);
      data[index++] = clamp(from[2] + (to[2] - from[2]) * t + grain);
    }
  }

  return data;
}

const width = 1200;
const height = 1200;
const overlay = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="90" y="90" width="1020" height="1020" rx="180" fill="#ffffff" opacity="0.14" />
    <path d="M360 600 L520 420 L680 600 L840 420" fill="none" stroke="#ffffff" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M360 800 L520 620 L680 800 L840 620" fill="none" stroke="#ffffff" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />
  </svg>
`;

await mkdir(assets, { recursive: true });

const raw = makeGrainBuffer(width, height, [10, 90, 110], [20, 150, 255], 18, 5150);

await sharp(raw, { raw: { width, height, channels: 3 } })
  .composite([{ input: Buffer.from(overlay), blend: "over" }])
  .png({ compressionLevel: 6 })
  .toFile(join(assets, "thumb.png"));

console.log("Generated heavy icon in", assets);
