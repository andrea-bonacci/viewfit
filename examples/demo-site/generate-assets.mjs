import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(fileURLToPath(import.meta.url));
const assets = join(root, "assets");

const shapes = `
  <circle cx="380" cy="320" r="240" fill="#ff8a3d" opacity="0.85" />
  <circle cx="1650" cy="1050" r="420" fill="#3d7dff" opacity="0.65" />
  <circle cx="1250" cy="420" r="300" fill="#16c2a3" opacity="0.55" />
  <circle cx="820" cy="1280" r="360" fill="#b44dff" opacity="0.5" />
`;

function heroSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1530" />
          <stop offset="55%" stop-color="#1d3b6e" />
          <stop offset="100%" stop-color="#0d1b33" />
        </linearGradient>
      </defs>
      <rect width="2400" height="1600" fill="url(#g)" />
      ${shapes}
      <text x="120" y="1420" font-family="Helvetica, Arial, sans-serif" font-size="180" font-weight="bold" fill="#ffffff" opacity="0.92">VIEWFIT</text>
      <text x="126" y="1510" font-family="Helvetica, Arial, sans-serif" font-size="52" fill="#ffffff" opacity="0.6">rendered dimensions matter</text>
    </svg>
  `;
}

function productSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600">
      <defs>
        <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fdf1e7" />
          <stop offset="100%" stop-color="#ffd9c2" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1600" fill="url(#p)" />
      <rect x="240" y="240" width="1120" height="1120" rx="80" fill="#ff7a45" />
      <circle cx="800" cy="760" r="300" fill="#ffffff" opacity="0.9" />
      <circle cx="800" cy="760" r="160" fill="#ff7a45" />
      <text x="800" y="1380" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="bold" fill="#7a3414">PRODUCT</text>
    </svg>
  `;
}

function thumbSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <defs>
        <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1dd1a1" />
          <stop offset="100%" stop-color="#0a84ff" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" rx="120" fill="url(#t)" />
      <path d="M180 300 L260 210 L340 300 L420 210" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M180 400 L260 310 L340 400 L420 310" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />
    </svg>
  `;
}

function bannerSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
      <defs>
        <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#101a2e" />
          <stop offset="100%" stop-color="#244a7c" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#b)" />
      <circle cx="1520" cy="260" r="340" fill="#ff8a3d" opacity="0.7" />
      <circle cx="1650" cy="820" r="260" fill="#16c2a3" opacity="0.6" />
      <circle cx="300" cy="900" r="300" fill="#b44dff" opacity="0.45" />
      <path d="M0 760 C420 600 720 980 1140 820 C1440 700 1680 860 1920 720 L1920 1080 L0 1080 Z" fill="#ffffff" opacity="0.06" />
    </svg>
  `;
}

await mkdir(assets, { recursive: true });

await Promise.all([
  sharp(Buffer.from(heroSvg())).jpeg({ quality: 94 }).toFile(join(assets, "hero.jpg")),
  sharp(Buffer.from(productSvg())).jpeg({ quality: 94 }).toFile(join(assets, "product.jpg")),
  sharp(Buffer.from(thumbSvg())).png().toFile(join(assets, "thumb.png")),
  sharp(Buffer.from(bannerSvg())).jpeg({ quality: 94 }).toFile(join(assets, "banner.jpg")),
]);

console.log("Generated demo assets in", assets);
