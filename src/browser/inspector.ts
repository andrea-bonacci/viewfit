import { chromium, type Browser, type Page } from "playwright";
import { getDevicePreset } from "../config/devices.js";
import type { CollectedImage, InspectOptions } from "../types.js";
import { collectImagesInPage } from "./collector.js";

export interface InspectionResult {
  images: CollectedImage[];
  pageUrl: string;
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

export async function inspectPage(
  pageUrl: string,
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

    const page = await context.newPage();

    try {
      await page.goto(pageUrl, {
        waitUntil: "load",
        timeout: options.timeout,
      });

      await page
        .waitForLoadState("networkidle", { timeout: 5000 })
        .catch(() => undefined);

      await autoScroll(page);
      await decodeImages(page);

      const images = (await page.evaluate(
        collectImagesInPage,
      )) as CollectedImage[];

      return {
        images,
        pageUrl,
        deviceName: preset.name,
        viewport: preset.viewport,
        dpr: preset.deviceScaleFactor,
      };
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
