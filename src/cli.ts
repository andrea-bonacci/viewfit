import { readFileSync } from "node:fs";
import chalk from "chalk";
import { Command } from "commander";
import { isDeviceMode, parseViewport } from "./config/devices.js";
import { getPreset, PRESETS } from "./config/presets.js";
import { parseTier } from "./core/tiers.js";
import { run } from "./index.js";
import type {
  DeviceMode,
  OutputFormat,
  RunOptions,
  Tier,
} from "./types.js";

interface CommonCliOptions {
  preset?: string;
  device?: string;
  viewport?: string;
  tier?: string;
  quality?: string;
  format?: string;
  root?: string;
  browser: string;
  timeout: string;
  interactive: boolean;
  json: boolean;
}

interface OptimizeCliOptions extends CommonCliOptions {
  out?: string;
  inPlace: boolean;
  site: boolean;
  yes: boolean;
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
  .addHelpText(
    "after",
    "\nRun `viewfit inspect --help` or `viewfit optimize --help` for the full option list.",
  );

addCommonOptions(
  program
    .command("inspect")
    .description("Analyze images and print a report. Never writes files.")
    .argument(
      "[target]",
      "local directory, HTML file or URL to inspect",
      ".",
    ),
).action(async (target: string, raw: CommonCliOptions) => {
  await run(normalizeOptions(target, raw, false));
});

addCommonOptions(
  program
    .command("optimize")
    .description("Analyze images and write the optimized files.")
    .argument(
      "[target]",
      "local directory, HTML file or URL to optimize",
      ".",
    ),
)
  .option("--out <dir>", "output directory (default: viewfit-output)")
  .option("-w, --in-place", "overwrite the original files", false)
  .option(
    "--site",
    "copy HTML/CSS/JS into the output folder and rewrite image references",
    false,
  )
  .option("-y, --yes", "skip confirmation prompts", false)
  .action(async (target: string, raw: OptimizeCliOptions) => {
    await run(normalizeOptions(target, raw, true, raw));
  });

function addCommonOptions(command: Command): Command {
  return command
    .option(
      "-p, --preset <name>",
      `preset: ${Object.keys(PRESETS).join(", ")}`,
    )
    .option("-d, --device <mode>", "device mode: desktop or mobile")
    .option("--viewport <width>x<height>", "viewport override, e.g. 1440x900")
    .option(
      "-t, --tier <tier>",
      "exact, safe, aggressive, extreme or a number (1-100)",
    )
    .option("-q, --quality <number>", "encoder quality (1-100)")
    .option("-f, --format <format>", "original, webp or avif")
    .option("--root <dir>", "project root used to map URLs to local files")
    .option(
      "--browser <channel>",
      "Playwright browser channel (chromium or chrome)",
      "chromium",
    )
    .option("--timeout <ms>", "navigation timeout in milliseconds", "30000")
    .option(
      "-i, --interactive",
      "choose tier, format and quality interactively",
      false,
    )
    .option("--json", "print the analysis as JSON", false);
}

function normalizeOptions(
  target: string,
  raw: CommonCliOptions,
  apply: boolean,
  optimize?: OptimizeCliOptions,
): RunOptions {
  const preset = raw.preset ? getPreset(raw.preset) : undefined;

  const deviceValue = raw.device ?? preset?.device ?? "desktop";
  if (!isDeviceMode(deviceValue)) {
    throw new Error(`Invalid device "${deviceValue}". Use desktop or mobile.`);
  }
  const device: DeviceMode = deviceValue;

  const viewport = raw.viewport ? parseViewport(raw.viewport) : undefined;

  const tier: Tier =
    raw.tier !== undefined ? parseTier(raw.tier) : (preset?.tier ?? "exact");

  const quality = Number(raw.quality ?? preset?.quality ?? 80);
  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error("--quality must be an integer between 1 and 100.");
  }

  const formatValue = raw.format ?? preset?.format ?? "original";
  if (!isOutputFormat(formatValue)) {
    throw new Error(
      `Invalid format "${formatValue}". Use original, webp or avif.`,
    );
  }
  const format: OutputFormat = formatValue;

  const timeout = Number(raw.timeout);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error("--timeout must be a positive number.");
  }

  const write = optimize?.inPlace ?? false;
  const site = optimize?.site ?? false;

  if (write && format !== "original") {
    throw new Error(
      "--in-place requires --format original. Use --out to convert formats.",
    );
  }

  if (write && site) {
    throw new Error(
      "--site cannot be combined with --in-place. Use --out to keep a copy of the site.",
    );
  }

  if (write && optimize?.out) {
    throw new Error("--in-place cannot be combined with --out.");
  }

  return {
    target,
    root: raw.root,
    device,
    viewport,
    tier,
    quality,
    format,
    output: optimize?.out ?? "viewfit-output",
    write,
    site,
    browser: raw.browser,
    timeout,
    dryRun: !apply,
    interactive: raw.interactive,
    yes: optimize?.yes ?? false,
    json: raw.json,
  };
}

function isOutputFormat(value: string): value is OutputFormat {
  return value === "original" || value === "webp" || value === "avif";
}

const argv = process.argv.slice();
const first = argv[2];
const isHelpOrVersion =
  first === "--help" ||
  first === "-h" ||
  first === "--version" ||
  first === "-V";

if (!isHelpOrVersion && first !== "inspect" && first !== "optimize") {
  argv.splice(2, 0, "inspect");
}

program.parseAsync(argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(message));
  process.exitCode = 1;
});
