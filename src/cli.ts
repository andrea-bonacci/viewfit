import { readFileSync } from "node:fs";
import chalk from "chalk";
import { Command } from "commander";
import { isDeviceMode, parseViewport } from "./config/devices.js";
import { parseTier } from "./core/tiers.js";
import { run } from "./index.js";
import type { DeviceMode, OutputFormat, RunOptions } from "./types.js";

interface CliOptions {
  device: string;
  dpr?: string;
  viewport?: string;
  tier: string;
  quality: string;
  format: string;
  output: string;
  write: boolean;
  root?: string;
  browser: string;
  timeout: string;
  dryRun: boolean;
  interactive: boolean;
  yes: boolean;
  json: boolean;
}

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const program = new Command();

program
  .name("viewfit")
  .description(
    "Fit and compress images to their actual rendered dimensions using a headless browser.",
  )
  .version(packageJson.version)
  .argument("[target]", "local directory, HTML file or URL to inspect", ".")
  .option("-d, --device <mode>", "device mode: desktop or mobile", "desktop")
  .option("--dpr <number>", "device pixel ratio override")
  .option("--viewport <width>x<height>", "viewport override, e.g. 1440x900")
  .option(
    "-t, --tier <tier>",
    "exact, safe, aggressive, extreme or a number (1-100)",
    "exact",
  )
  .option("-q, --quality <number>", "encoder quality (1-100)", "80")
  .option("-f, --format <format>", "original, webp or avif", "original")
  .option("-o, --output <dir>", "output directory", "viewfit-output")
  .option("-w, --write", "overwrite the original files", false)
  .option("--root <dir>", "project root used to map URLs to local files")
  .option(
    "--browser <channel>",
    "Playwright browser channel (chromium or chrome)",
    "chromium",
  )
  .option("--timeout <ms>", "navigation timeout in milliseconds", "30000")
  .option("--dry-run", "analyze and report without writing files", false)
  .option("-i, --interactive", "choose tier, format and quality interactively", false)
  .option("-y, --yes", "skip confirmation prompts", false)
  .option("--json", "print the analysis as JSON", false)
  .action(async (target: string, raw: CliOptions) => {
    const options = normalizeOptions(target, raw);
    await run(options);
  });

function normalizeOptions(target: string, raw: CliOptions): RunOptions {
  if (!isDeviceMode(raw.device)) {
    throw new Error(`Invalid device "${raw.device}". Use desktop or mobile.`);
  }

  const dpr = raw.dpr === undefined ? undefined : Number(raw.dpr);
  if (dpr !== undefined && (!Number.isFinite(dpr) || dpr <= 0)) {
    throw new Error("--dpr must be a positive number.");
  }

  const viewport = raw.viewport ? parseViewport(raw.viewport) : undefined;
  const quality = Number(raw.quality);
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error("--quality must be an integer between 1 and 100.");
  }

  if (!isOutputFormat(raw.format)) {
    throw new Error(`Invalid format "${raw.format}". Use original, webp or avif.`);
  }

  const timeout = Number(raw.timeout);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error("--timeout must be a positive number.");
  }

  if (raw.write && raw.format !== "original") {
    throw new Error(
      "--write requires --format original. Use --output to convert formats.",
    );
  }

  return {
    target,
    root: raw.root,
    device: raw.device as DeviceMode,
    dpr,
    viewport,
    tier: parseTier(raw.tier),
    quality,
    format: raw.format,
    output: raw.output,
    write: raw.write,
    browser: raw.browser,
    timeout,
    dryRun: raw.dryRun,
    interactive: raw.interactive,
    yes: raw.yes,
    json: raw.json,
  };
}

function isOutputFormat(value: string): value is OutputFormat {
  return value === "original" || value === "webp" || value === "avif";
}

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(message));
  process.exitCode = 1;
});
