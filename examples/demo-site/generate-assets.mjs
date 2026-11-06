import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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

function svgDocument(width, height, body) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${body}
    </svg>
  `);
}

async function heavyJpeg(file, width, height, options) {
  const raw = makeGrainBuffer(
    width,
    height,
    options.from,
    options.to,
    options.amplitude,
    options.seed,
  );

  await sharp(raw, { raw: { width, height, channels: 3 } })
    .composite([{ input: svgDocument(width, height, options.overlay), blend: "over" }])
    .jpeg({ quality: options.quality, chromaSubsampling: "4:4:4" })
    .toFile(file);
}

async function heavyPng(file, width, height, options) {
  const raw = makeGrainBuffer(
    width,
    height,
    options.from,
    options.to,
    options.amplitude,
    options.seed,
  );

  await sharp(raw, { raw: { width, height, channels: 3 } })
    .composite([{ input: svgDocument(width, height, options.overlay), blend: "over" }])
    .png({ compressionLevel: 6 })
    .toFile(file);
}

const hero = {
  from: [9, 18, 42],
  to: [44, 92, 150],
  amplitude: 16,
  seed: 1337,
  quality: 98,
  overlay: `
    <circle cx="900" cy="780" r="620" fill="#ff8a3d" opacity="0.75" />
    <circle cx="3200" cy="1700" r="900" fill="#3d7dff" opacity="0.55" />
    <circle cx="2500" cy="620" r="520" fill="#16c2a3" opacity="0.5" />
    <circle cx="1500" cy="2200" r="700" fill="#b44dff" opacity="0.42" />
    <text x="180" y="2360" font-family="Helvetica, Arial, sans-serif" font-size="360" font-weight="bold" fill="#ffffff" opacity="0.92">VIEWFIT</text>
    <text x="188" y="2500" font-family="Helvetica, Arial, sans-serif" font-size="90" fill="#ffffff" opacity="0.62">rendered dimensions matter</text>
  `,
};

const banner = {
  from: [12, 16, 30],
  to: [40, 78, 120],
  amplitude: 15,
  seed: 2024,
  quality: 98,
  overlay: `
    <circle cx="2550" cy="380" r="620" fill="#ff8a3d" opacity="0.7" />
    <circle cx="2820" cy="1420" r="500" fill="#16c2a3" opacity="0.55" />
    <circle cx="420" cy="1500" r="520" fill="#b44dff" opacity="0.45" />
    <path d="M0 1280 C700 980 1200 1620 1900 1320 C2500 1080 2900 1420 3200 1180 L3200 1800 L0 1800 Z" fill="#ffffff" opacity="0.07" />
  `,
};

const gallery = {
  from: [24, 12, 34],
  to: [120, 44, 92],
  amplitude: 16,
  seed: 4242,
  quality: 98,
  overlay: `
    <circle cx="700" cy="600" r="480" fill="#ffd23d" opacity="0.6" />
    <circle cx="2500" cy="900" r="760" fill="#ff5a7a" opacity="0.5" />
    <circle cx="3100" cy="2000" r="640" fill="#4dd2ff" opacity="0.5" />
    <text x="180" y="2180" font-family="Helvetica, Arial, sans-serif" font-size="280" font-weight="bold" fill="#ffffff" opacity="0.9">GALLERY</text>
  `,
};

const product = {
  from: [250, 236, 220],
  to: [255, 196, 150],
  amplitude: 14,
  seed: 777,
  quality: 98,
  overlay: `
    <rect x="360" y="360" width="1680" height="1680" rx="120" fill="#ff7a45" />
    <circle cx="1200" cy="1140" r="460" fill="#ffffff" opacity="0.92" />
    <circle cx="1200" cy="1140" r="240" fill="#ff7a45" />
    <text x="1200" y="2020" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="150" font-weight="bold" fill="#7a3414">PRODUCT</text>
  `,
};

const thumb = {
  from: [10, 90, 110],
  to: [20, 150, 255],
  amplitude: 18,
  seed: 5150,
  overlay: `
    <rect x="90" y="90" width="1020" height="1020" rx="180" fill="#ffffff" opacity="0.14" />
    <path d="M360 600 L520 420 L680 600 L840 420" fill="none" stroke="#ffffff" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M360 800 L520 620 L680 800 L840 620" fill="none" stroke="#ffffff" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />
  `,
};

await mkdir(assets, { recursive: true });

await Promise.all([
  heavyJpeg(join(assets, "hero.jpg"), 4000, 2600, hero),
  heavyJpeg(join(assets, "banner.jpg"), 3200, 1800, banner),
  heavyJpeg(join(assets, "gallery.jpg"), 3600, 2400, gallery),
  heavyJpeg(join(assets, "product.jpg"), 2400, 2400, product),
  heavyPng(join(assets, "thumb.png"), 1200, 1200, thumb),
]);

console.log("Generated heavy demo assets in", assets);
