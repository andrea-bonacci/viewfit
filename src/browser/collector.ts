import type { CollectedImage, ImageFit } from "../types.js";

interface BrowserImage {
  src: string;
  kind: "img" | "background";
  cssWidth: number;
  cssHeight: number;
  fit: ImageFit;
  selector: string;
}

export function collectImagesInPage(): BrowserImage[] {
  const results: BrowserImage[] = [];
  const absolute = (value: string): string => {
    try {
      return new URL(value, document.baseURI).href;
    } catch {
      return value;
    }
  };

  const selectorFor = (element: Element): string => {
    const tag = element.tagName.toLowerCase();
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    const className = element.getAttribute("class");
    if (className) {
      const classes = className
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((name) => `.${CSS.escape(name)}`)
        .join("");
      if (classes) {
        return `${tag}${classes}`;
      }
    }
    return tag;
  };

  const normalizeFit = (value: string): ImageFit => {
    switch (value) {
      case "cover":
      case "contain":
      case "fill":
      case "none":
      case "scale-down":
        return value;
      default:
        return "fill";
    }
  };

  const normalizeBackgroundFit = (value: string): ImageFit => {
    const normalized = value.trim().toLowerCase();
    if (normalized === "cover" || normalized === "contain") {
      return normalized;
    }
    if (normalized === "auto" || normalized === "") {
      return "auto";
    }
    return "fill";
  };

  const backgroundUrls = (value: string): string[] => {
    const urls: string[] = [];
    const pattern = /url\((['"]?)(.*?)\1\)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(value)) !== null) {
      const url = match[2];
      if (url && !url.startsWith("data:")) {
        urls.push(url);
      }
    }

    return urls;
  };

  for (const image of Array.from(document.images)) {
    const rect = image.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    const src = image.currentSrc || image.src;
    if (!src || src.startsWith("data:")) {
      continue;
    }

    results.push({
      src: absolute(src),
      kind: "img",
      cssWidth: rect.width,
      cssHeight: rect.height,
      fit: normalizeFit(getComputedStyle(image).objectFit),
      selector: selectorFor(image),
    });
  }

  const elements = Array.from(document.querySelectorAll<HTMLElement>("*"));

  const addBackground = (
    element: HTMLElement,
    pseudo: string,
    style: CSSStyleDeclaration,
  ): void => {
    if (!style.backgroundImage || style.backgroundImage === "none") {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const fit = normalizeBackgroundFit(style.backgroundSize);
    const selector = `${selectorFor(element)}${pseudo}`;

    for (const url of backgroundUrls(style.backgroundImage)) {
      results.push({
        src: absolute(url),
        kind: "background",
        cssWidth: rect.width,
        cssHeight: rect.height,
        fit,
        selector,
      });
    }
  };

  for (const element of elements) {
    addBackground(element, "", getComputedStyle(element));
    addBackground(element, "::before", getComputedStyle(element, "::before"));
    addBackground(element, "::after", getComputedStyle(element, "::after"));
  }

  return results;
}

export type { CollectedImage };
