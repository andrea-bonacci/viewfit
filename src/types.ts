export type DeviceMode = "desktop" | "mobile";

export type ImageKind = "img" | "background";

export type OutputFormat = "original" | "webp" | "avif";

export type ImageFit =
  | "cover"
  | "contain"
  | "fill"
  | "none"
  | "scale-down"
  | "auto";

export type TierName = "exact" | "safe" | "aggressive" | "extreme";

export type Tier = TierName | number;

export interface Viewport {
  width: number;
  height: number;
}

export interface DevicePreset {
  name: string;
  viewport: Viewport;
  deviceScaleFactor: number;
  isMobile: boolean;
}

export interface CollectedImage {
  src: string;
  kind: ImageKind;
  cssWidth: number;
  cssHeight: number;
  fit: ImageFit;
  selector: string;
}

export interface ImageContext {
  kind: ImageKind;
  cssWidth: number;
  cssHeight: number;
  fit: ImageFit;
  selector: string;
}

export interface ImageAnalysis {
  url: string;
  filePath: string | null;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  originalFormat: string | null;
  renderedWidth: number;
  renderedHeight: number;
  contexts: ImageContext[];
  targetWidth: number;
  targetHeight: number;
  estimatedBytes: number | null;
  savingsBytes: number | null;
  savingsPercent: number | null;
  transformable: boolean;
  recommended: boolean;
  reason?: string;
}

export interface InspectOptions {
  device: DeviceMode;
  dpr: number;
  viewport?: Viewport;
  timeout: number;
  browser: string;
}

export interface AnalyzeOptions {
  dpr: number;
  tierScale: number;
  quality: number;
  format: OutputFormat;
  pageUrl: string;
  rootDir: string | null;
  estimate: boolean;
}

export interface RunOptions {
  target: string;
  root?: string;
  device: DeviceMode;
  dpr?: number;
  viewport?: Viewport;
  tier: Tier;
  quality: number;
  format: OutputFormat;
  output: string;
  write: boolean;
  browser: string;
  timeout: number;
  dryRun: boolean;
  interactive: boolean;
  yes: boolean;
  json: boolean;
}
