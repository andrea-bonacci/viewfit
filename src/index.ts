import { existsSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { inspectPage } from "./browser/inspector.js";
import { getDevicePreset } from "./config/devices.js";
import { compressImage } from "./core/compress.js";
import { analyzeImages } from "./core/recommend.js";
import { copyStaticSite } from "./core/site.js";
import { resolveTierScale } from "./core/tiers.js";
import { chooseInteractiveOptions, confirmProceed } from "./report/prompts.js";
import { renderReport } from "./report/table.js";
import { startStaticServer, type StaticServer } from "./server/static.js";
import type { OutputFormat, RunOptions } from "./types.js";
import { formatBytes } from "./utils/bytes.js";

export * from "./types.js";
export { analyzeImages, requiredScale } from "./core/recommend.js";
export { resolveTierScale, parseTier, TIER_PRESETS } from "./core/tiers.js";
export { DEVICE_PRESETS, getDevicePreset, parseViewport } from "./config/devices.js";

export async function run(options: RunOptions): Promise<void> {
  const isUrl = /^https?:\/\//i.test(options.target);
  let rootDir = options.root ? resolve(options.root) : null;
  let server: StaticServer | null = null;
  let pageUrl = options.target;

  try {
    if (isUrl) {
      if (rootDir && !isDirectory(rootDir)) {
        throw new Error(`Root directory not found: ${rootDir}`);
      }
    } else {
      const targetPath = resolve(options.target);
      if (!existsSync(targetPath)) {
        throw new Error(`Target not found: ${targetPath}`);
      }

      const stats = statSync(targetPath);

      if (stats.isDirectory()) {
        rootDir = targetPath;
        server = await startStaticServer(targetPath);
        pageUrl = server.url;
      } else if (stats.isFile()) {
        let serveDir = resolve(options.root ?? dirname(targetPath));
        let relativeFile = relative(serveDir, targetPath);

        if (relativeFile.startsWith("..") || relativeFile === "") {
          serveDir = dirname(targetPath);
          relativeFile = relative(serveDir, targetPath);
        }

        rootDir = serveDir;
        server = await startStaticServer(serveDir);
        pageUrl = `${server.url}/${relativeFile.split(sep).join("/")}`;
      } else {
        throw new Error(`Target is not a file or directory: ${targetPath}`);
      }
    }

    const preset = getDevicePreset(
      options.device,
      options.dpr,
      options.viewport,
    );

    const inspectSpinner = ora(
      `Inspecting ${pageUrl} as ${preset.name} ${preset.viewport.width}×${preset.viewport.height} @${preset.deviceScaleFactor}x`,
    ).start();

    let inspection;
    try {
      inspection = await inspectPage(pageUrl, {
        device: options.device,
        dpr: preset.deviceScaleFactor,
        viewport: preset.viewport,
        timeout: options.timeout,
        browser: options.browser,
      });
      inspectSpinner.succeed(
        `Found ${inspection.images.length} rendered image references`,
      );
    } catch (error) {
      inspectSpinner.fail("Inspection failed");
      throw error;
    }

    if (inspection.images.length === 0) {
      console.log(chalk.yellow("No rendered images found on the page."));
      return;
    }

    let tier = options.tier;
    let format: OutputFormat = options.format;
    let quality = options.quality;

    if (options.interactive) {
      const chosen = await chooseInteractiveOptions(
        { tier, format, quality },
        inspection.images.length,
      );
      tier = chosen.tier;
      format = chosen.format;
      quality = chosen.quality;
    }

    if (options.write && format !== "original") {
      throw new Error(
        "--write keeps the original file names, so it requires --format original. Use an output directory to convert formats.",
      );
    }

    const tierScale = resolveTierScale(tier);

    const analyzeSpinner = ora("Analyzing image dimensions and sizes...").start();

    let analyses;
    try {
      analyses = await analyzeImages(inspection.images, {
        dpr: inspection.dpr,
        tierScale,
        quality,
        format,
        pageUrl,
        rootDir,
        estimate: true,
      });
      analyzeSpinner.succeed(`Analyzed ${analyses.length} unique images`);
    } catch (error) {
      analyzeSpinner.fail("Analysis failed");
      throw error;
    }

    if (options.json) {
      console.log(JSON.stringify(analyses, null, 2));
      return;
    }

    console.log("");
    console.log(
      renderReport(analyses, {
        rootDir,
        deviceName: inspection.deviceName,
        viewport: inspection.viewport,
        dpr: inspection.dpr,
        tierScale,
        format,
        quality,
      }),
    );
    console.log("");

    if (options.dryRun) {
      return;
    }

    const proceed = await confirmProceed(analyses, {
      write: options.write,
      output: options.output,
      yes: options.yes,
    });

    if (!proceed) {
      console.log(chalk.yellow("Nothing to do."));
      return;
    }

    const selected = analyses.filter((analysis) => analysis.recommended);
    const outputDir = resolve(options.output);

    if (!options.write && rootDir && outputDir === rootDir) {
      throw new Error(
        "--output cannot be the project root. Choose a subfolder or use --write.",
      );
    }

    const compressSpinner = ora(`Compressing ${selected.length} images...`).start();

    let originalBytes = 0;
    let outputBytes = 0;
    const failures: string[] = [];

    for (const analysis of selected) {
      try {
        const result = await compressImage(analysis, {
          format,
          quality,
          outputDir,
          write: options.write,
          rootDir,
        });
        originalBytes += analysis.originalBytes;
        outputBytes += result.bytes;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${analysis.filePath ?? analysis.url}: ${message}`);
      }
    }

    const saved = originalBytes - outputBytes;
    compressSpinner.succeed(
      `Compressed ${selected.length - failures.length} images · ${formatBytes(
        originalBytes,
      )} → ${formatBytes(outputBytes)} · saved ${formatBytes(Math.max(saved, 0))}`,
    );

    if (failures.length > 0) {
      console.log(chalk.red(`\n${failures.length} image(s) failed:`));
      for (const failure of failures) {
        console.log(chalk.red(`  - ${failure}`));
      }
      process.exitCode = 1;
    }

    if (options.site) {
      if (!rootDir) {
        console.log(
          chalk.yellow("--site requires a local root; site copy was skipped."),
        );
      } else {
        const siteSpinner = ora("Copying site files...").start();

        try {
          const analyzed = new Set(
            analyses
              .map((analysis) => analysis.filePath)
              .filter((filePath): filePath is string => Boolean(filePath)),
          );
          const optimized = new Set(
            selected
              .map((analysis) => analysis.filePath)
              .filter((filePath): filePath is string => Boolean(filePath)),
          );

          const siteResult = await copyStaticSite({
            rootDir,
            outputDir,
            analyzed,
            optimized,
          });

          siteSpinner.succeed(
            `Copied ${siteResult.copiedFiles} files · rewrote ${siteResult.rewrittenReferences} image references`,
          );
        } catch (error) {
          siteSpinner.fail("Site copy failed");
          throw error;
        }
      }
    }

    if (options.write) {
      console.log(chalk.dim("Original files were overwritten."));
    } else {
      console.log(chalk.dim(`Output written to ${outputDir}`));
    }
  } finally {
    if (server) {
      await server.close();
    }
  }
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}
