import prompts from "prompts";
import type {
  ImageAnalysis,
  OutputFormat,
  Tier,
  TierName,
} from "../types.js";
import { formatBytes } from "../utils/bytes.js";
import { TIER_DESCRIPTIONS } from "../core/tiers.js";

export interface InteractiveOptions {
  tier: Tier;
  format: OutputFormat;
  quality: number;
}

export async function chooseInteractiveOptions(
  defaults: InteractiveOptions,
  imageCount: number,
): Promise<InteractiveOptions> {
  const tierChoices: Array<{ title: string; value: TierName | "custom" }> = (
    Object.entries(TIER_DESCRIPTIONS) as Array<[TierName, string]>
  ).map(([value, title]) => ({ title, value }));

  tierChoices.push({ title: "Custom percentage", value: "custom" });

  const tierResponse = await prompts({
    type: "select",
    name: "tier",
    message: `Compression tier for ${imageCount} images`,
    choices: tierChoices,
    initial: Math.max(
      0,
      tierChoices.findIndex((choice) => choice.value === defaults.tier),
    ),
  });

  let tier: Tier = defaults.tier;

  if (tierResponse.tier === "custom") {
    const customResponse = await prompts({
      type: "number",
      name: "percentage",
      message: "Target scale as a percentage of the exact rendered size",
      initial: 80,
      min: 1,
      max: 100,
    });
    tier = Number(customResponse.percentage ?? 80);
  } else if (tierResponse.tier) {
    tier = tierResponse.tier as TierName;
  }

  const formatResponse = await prompts({
    type: "select",
    name: "format",
    message: "Output format",
    choices: [
      { title: "Keep original format", value: "original" },
      { title: "WebP", value: "webp" },
      { title: "AVIF", value: "avif" },
    ],
    initial: ["original", "webp", "avif"].indexOf(defaults.format),
  });

  const qualityResponse = await prompts({
    type: "number",
    name: "quality",
    message: "Encoder quality (1-100)",
    initial: defaults.quality,
    min: 1,
    max: 100,
  });

  return {
    tier,
    format: (formatResponse.format as OutputFormat) ?? defaults.format,
    quality: Number(qualityResponse.quality ?? defaults.quality),
  };
}

export async function confirmProceed(
  analyses: ImageAnalysis[],
  options: { write: boolean; output: string; yes: boolean },
): Promise<boolean> {
  const selected = analyses.filter((analysis) => analysis.recommended);

  if (selected.length === 0) {
    return false;
  }

  if (options.yes) {
    return true;
  }

  const totalOriginal = selected.reduce(
    (total, analysis) => total + analysis.originalBytes,
    0,
  );
  const totalEstimated = selected.reduce(
    (total, analysis) => total + (analysis.estimatedBytes ?? analysis.originalBytes),
    0,
  );

  const destination = options.write
    ? "overwrite the original files"
    : `write to ${options.output} (original files are kept)`;

  const response = await prompts({
    type: "confirm",
    name: "proceed",
    message: `Compress ${selected.length} images (${formatBytes(
      totalOriginal,
    )} → ${formatBytes(totalEstimated)}) and ${destination}?`,
    initial: true,
  });

  return Boolean(response.proceed);
}
