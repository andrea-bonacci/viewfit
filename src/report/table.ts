import chalk from "chalk";
import type { ImageAnalysis, OutputFormat, Viewport } from "../types.js";
import { formatBytes } from "../utils/bytes.js";

export interface ReportOptions {
  rootDir: string | null;
  deviceName: string;
  viewport: Viewport;
  dpr: number;
  tierScale: number;
  format: OutputFormat;
  quality: number;
}

interface Row {
  file: string;
  kind: string;
  rendered: string;
  target: string;
  original: string;
  estimated: string;
  savings: string;
  recommended: boolean;
  reason: string;
}

const MAX_FILE_WIDTH = 44;

function displayPath(analysis: ImageAnalysis, rootDir: string | null): string {
  if (analysis.filePath && rootDir) {
    const normalizedRoot = rootDir.endsWith("/") ? rootDir : `${rootDir}/`;
    if (analysis.filePath.startsWith(normalizedRoot)) {
      return analysis.filePath.slice(normalizedRoot.length);
    }
  }

  if (analysis.filePath) {
    return analysis.filePath;
  }

  try {
    return new URL(analysis.url).pathname;
  } catch {
    return analysis.url;
  }
}

function truncate(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) {
    return value;
  }
  return `${value.slice(0, maxWidth - 1)}…`;
}

function buildRows(
  analyses: ImageAnalysis[],
  options: ReportOptions,
): Row[] {
  return analyses.map((analysis) => {
    const kinds = new Set(analysis.contexts.map((context) => context.kind));
    const magnitude =
      analysis.savingsPercent === null
        ? null
        : Math.abs(analysis.savingsPercent);
    const savings =
      magnitude === null
        ? "-"
        : `${analysis.savingsPercent! >= 0 ? "-" : "+"}${
            magnitude >= 99.5 ? magnitude.toFixed(1) : magnitude.toFixed(0)
          }%`;

    return {
      file: truncate(displayPath(analysis, options.rootDir), MAX_FILE_WIDTH),
      kind: kinds.size === 2 ? "mixed" : (analysis.contexts[0]?.kind ?? "img"),
      rendered: `${Math.round(analysis.renderedWidth)}×${Math.round(
        analysis.renderedHeight,
      )}`,
      target: `${analysis.targetWidth}×${analysis.targetHeight}`,
      original:
        analysis.originalBytes > 0 ? formatBytes(analysis.originalBytes) : "-",
      estimated:
        analysis.estimatedBytes !== null
          ? `~${formatBytes(analysis.estimatedBytes)}`
          : "-",
      savings,
      recommended: analysis.recommended,
      reason: analysis.reason ?? "",
    };
  });
}

function pad(value: string, width: number): string {
  return value.padEnd(width);
}

export function renderReport(
  analyses: ImageAnalysis[],
  options: ReportOptions,
): string {
  const rows = buildRows(analyses, options);
  const headers = [
    "FILE",
    "KIND",
    "RENDERED",
    "TARGET",
    "ORIGINAL",
    "EST. SIZE",
    "SAVE",
  ];

  const widths = headers.map((header, index) => {
    const key = [
      "file",
      "kind",
      "rendered",
      "target",
      "original",
      "estimated",
      "savings",
    ][index] as keyof Row;
    const values = rows.map((row) => String(row[key]).length);
    return Math.max(header.length, ...values);
  });

  const lines: string[] = [];
  const headerLine = headers
    .map((header, index) => pad(header, widths[index] ?? header.length))
    .join("  ");

  lines.push(
    chalk.bold(
      `${options.deviceName} ${options.viewport.width}×${options.viewport.height} @${options.dpr}x · tier ${Math.round(
        options.tierScale * 100,
      )}% · ${options.format} q${options.quality}`,
    ),
  );
  lines.push(chalk.dim(headerLine));
  lines.push(chalk.dim(widths.map((width) => "─".repeat(width)).join("  ")));

  let totalOriginal = 0;
  let totalEstimated = 0;
  let recommendedCount = 0;

  for (const row of rows) {
    const cells = [
      row.file,
      row.kind,
      row.rendered,
      row.target,
      row.original,
      row.estimated,
      row.savings,
    ].map((value, index) => pad(value, widths[index] ?? value.length));

    const line = cells.join("  ");

    if (row.recommended) {
      recommendedCount += 1;
      lines.push(chalk.green(line));
    } else {
      lines.push(chalk.dim(line));
    }

    if (row.reason) {
      lines.push(chalk.dim(`  ${row.reason}`));
    }
  }

  for (const analysis of analyses) {
    if (!analysis.recommended) {
      continue;
    }
    totalOriginal += analysis.originalBytes;
    totalEstimated += analysis.estimatedBytes ?? analysis.originalBytes;
  }

  const saved = totalOriginal - totalEstimated;
  const percent = totalOriginal > 0 ? (saved / totalOriginal) * 100 : 0;

  lines.push("");
  lines.push(
    `${recommendedCount} of ${analyses.length} images optimizable · ${chalk.bold(
      formatBytes(totalOriginal),
    )} → ${chalk.bold(formatBytes(totalEstimated))} · save ${chalk.green(
      `${formatBytes(saved)} (${percent.toFixed(0)}%)`,
    )}`,
  );

  return lines.join("\n");
}
