import type { DeviceMode, DevicePreset, Viewport } from "../types.js";

export const DEVICE_PRESETS: Record<DeviceMode, DevicePreset> = {
  desktop: {
    name: "Desktop",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
  },
  mobile: {
    name: "Mobile",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
  },
};

export function isDeviceMode(value: string): value is DeviceMode {
  return value === "desktop" || value === "mobile";
}

export function parseViewport(value: string): Viewport {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid viewport "${value}". Expected a value like 1440x900.`);
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (width <= 0 || height <= 0) {
    throw new Error("Viewport dimensions must be positive.");
  }

  return { width, height };
}

export function getDevicePreset(
  mode: DeviceMode,
  dpr?: number,
  viewport?: Viewport,
): DevicePreset {
  const base = DEVICE_PRESETS[mode];
  return {
    ...base,
    viewport: viewport ?? base.viewport,
    deviceScaleFactor: dpr ?? base.deviceScaleFactor,
  };
}
