import { chromium, type Browser, type Page } from "playwright";
import { getDevicePreset } from "../config/devices.js";
import type { CollectedImage, InspectOptions } from "../types.js";
import { collectImagesInPage } from "./collector.js";

export interface InspectionFailure {
  pageUrl: string;
  message: string;
}

export interface InspectionResult {
  images: CollectedImage[];
  pageUrl: string;
  pages: string[];
  failures: InspectionFailure[];
  deviceName: string;
  viewport: { width: number; height: number };
  dpr: number;
}

async function launchBrowser(channel: string): Promise<Browser> {
  const requested = channel === "chromium" ? undefined : channel;

  try {
    return await chromium.launch({ channel: requested, headless: true });
  } catch (error) {
    if (requested) {
      throw error;
    }

    try {
      return await chromium.launch({ channel: "chrome", headless: true });
    } catch {
      throw new Error(
        "Unable to launch Chromium. Install it with `npx playwright install chromium` or use `--browser chrome` if Google Chrome is installed.",
      );
    }
  }
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const delay = (ms: number) =>
      new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));

    const distance = Math.max(window.innerHeight, 400);
    const height = document.body?.scrollHeight ?? document.documentElement.scrollHeight;

    for (let y = 0; y < height; y += distance) {
      window.scrollTo(0, y);
      await delay(60);
    }

    window.scrollTo(0, 0);
    await delay(100);
  });
}

async function decodeImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((image) =>
        image.decode().catch(() => undefined),
      ),
    );
  });
}

async function inspectPageInContext(
  page: Page,
  pageUrl: string,
  timeout: number,
): Promise<CollectedImage[]> {
  await page.goto(pageUrl, {
    waitUntil: "load",
    timeout,
  });

  await page
    .waitForLoadState("networkidle", { timeout: 5000 })
    .catch(() => undefined);

  await autoScroll(page);
  await decodeImages(page);

  return (await page.evaluate(collectImagesInPage)) as CollectedImage[];
}

export async function inspectPages(
  pageUrls: string[],
  options: InspectOptions,
): Promise<InspectionResult> {
  const preset = getDevicePreset(options.device, options.dpr, options.viewport);
  const browser = await launchBrowser(options.browser);

  try {
    const context = await browser.newContext({
      viewport: preset.viewport,
      deviceScaleFactor: preset.deviceScaleFactor,
      isMobile: preset.isMobile,
      hasTouch: preset.isMobile,
    });

    const images: CollectedImage[] = [];
    const failures: InspectionFailure[] = [];

    try {
      for (const pageUrl of pageUrls) {
        const page = await context.newPage();

        try {
          images.push(...(await inspectPageInContext(page, pageUrl, options.timeout)));
        } catch (error) {
          failures.push({
            pageUrl,
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          await page.close();
        }
      }
    } finally {
      await context.close();
    }

    return {
      images,
      pageUrl: pageUrls[0] ?? "",
      pages: pageUrls,
      failures,
      deviceName: preset.name,
      viewport: preset.viewport,
      dpr: preset.deviceScaleFactor,
    };
  } finally {
    await browser.close();
  }
}

export async function inspectPage(
  pageUrl: string,
  options: InspectOptions,
): Promise<InspectionResult> {
  return inspectPages([pageUrl], options);
}
