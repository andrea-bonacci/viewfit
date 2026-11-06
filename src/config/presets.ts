import type { DeviceMode, OutputFormat, TierName } from "../types.js";

export interface Preset {
  description: string;
  device: DeviceMode;
  tier: TierName;
  format: OutputFormat;
  quality: number;
}

export const PRESETS: Record<string, Preset> = {
  web: {
    description: "Mobile · WebP · 90% tier · quality 80",
    device: "mobile",
    tier: "safe",
    format: "webp",
    quality: 80,
  },
  hq: {
    description: "Desktop · AVIF · exact tier · quality 85",
    device: "desktop",
    tier: "exact",
    format: "avif",
    quality: 85,
  },
  fast: {
    description: "Mobile · WebP · 75% tier · quality 70",
    device: "mobile",
    tier: "aggressive",
    format: "webp",
    quality: 70,
  },
};

export function getPreset(name: string): Preset {
  const preset = PRESETS[name.toLowerCase()];
  if (!preset) {
    throw new Error(
      `Unknown preset "${name}". Use ${Object.keys(PRESETS).join(", ")}.`,
    );
  }
  return preset;
}
