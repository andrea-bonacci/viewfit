import type { Tier, TierName } from "../types.js";

export const TIER_PRESETS: Record<TierName, number> = {
  exact: 1,
  safe: 0.9,
  aggressive: 0.75,
  extreme: 0.5,
};

export const TIER_DESCRIPTIONS: Record<TierName, string> = {
  exact: "Exact rendered size (100%)",
  safe: "Slightly below rendered size (90%)",
  aggressive: "Clearly below rendered size (75%)",
  extreme: "Half of the rendered size (50%)",
};

export function isTierName(value: string): value is TierName {
  return Object.prototype.hasOwnProperty.call(TIER_PRESETS, value);
}

export function resolveTierScale(tier: Tier): number {
  if (typeof tier === "number") {
    const scale = tier > 1 ? tier / 100 : tier;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new Error("Tier number must be a positive percentage or ratio.");
    }
    return Math.min(scale, 1);
  }

  const preset = TIER_PRESETS[tier];
  if (preset === undefined) {
    throw new Error(`Unknown tier "${tier}".`);
  }
  return preset;
}

export function parseTier(value: string): Tier {
  const normalized = value.trim().toLowerCase();

  if (isTierName(normalized)) {
    return normalized;
  }

  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric > 1 ? numeric / 100 : numeric;
  }

  throw new Error(
    `Invalid tier "${value}". Use exact, safe, aggressive, extreme or a number between 1 and 100.`,
  );
}
