# ViewFit

Fit and compress every image to the size it is actually rendered at, using a real headless browser.

ViewFit inspects a local site with Playwright, measures each `<img>` and CSS `background-image` with `getBoundingClientRect()`, applies the device pixel ratio, and recommends a per-image target size. Sharp then resizes and compresses each file individually instead of applying one generic setting to everything.

## Requirements

- Node.js >= 18
- A Chromium browser for Playwright:
  - `npx playwright install chromium`, or
  - use an installed Google Chrome with `--browser chrome`

## Install

```bash
npm install -g viewfit
```

## Usage

```bash
# Inspect the current directory (served internally) in desktop mode
viewfit

# Inspect a build output directory
viewfit ./dist --device desktop

# Inspect an already running local server
viewfit http://localhost:3000 --root . --device mobile

# Report only, do not write files
viewfit ./dist --dry-run

# Compress into an output folder (originals are kept)
viewfit ./dist --output optimized --tier aggressive

# Custom tier: 80% of the exact rendered size
viewfit ./dist --tier 80 --format webp

# Overwrite originals (same format only)
viewfit ./dist --write --yes

# Interactive choices for tier, format and quality
viewfit ./dist --interactive
```

## How it works

1. Serves the target directory or connects to an existing URL.
2. Opens the page in Chromium with the selected viewport, device pixel ratio and mobile emulation.
3. Scrolls the page to trigger lazy loading and waits for images to decode.
4. Collects every rendered `<img>` and CSS background image with its CSS box and fit mode.
5. Reads real dimensions and file size with Sharp.
6. Computes the target size from the rendered box, DPR and compression tier.
7. Prints a report with original size, rendered size, target size and estimated savings.
8. On confirmation, resizes and re-encodes each image with Sharp.

Images that cannot be mapped to a local file (remote/CDN assets) are reported but not modified.

## Options

| Option | Description | Default |
| --- | --- | --- |
| `[target]` | Local directory or URL to inspect | `.` |
| `-d, --device <mode>` | `desktop` or `mobile` | `desktop` |
| `--dpr <number>` | Device pixel ratio override | preset |
| `--viewport <w>x<h>` | Viewport override, e.g. `1440x900` | preset |
| `-t, --tier <tier>` | `exact`, `safe`, `aggressive`, `extreme` or a number (1-100) | `exact` |
| `-q, --quality <number>` | Encoder quality (1-100) | `80` |
| `-f, --format <format>` | `original`, `webp` or `avif` | `original` |
| `-o, --output <dir>` | Output directory | `viewfit-output` |
| `-w, --write` | Overwrite originals (requires `--format original`) | `false` |
| `--root <dir>` | Root used to map URLs to local files when using a URL | none |
| `--browser <channel>` | Playwright channel: `chromium` or `chrome` | `chromium` |
| `--timeout <ms>` | Navigation timeout | `30000` |
| `--dry-run` | Analyze and report only | `false` |
| `-i, --interactive` | Choose tier, format and quality interactively | `false` |
| `-y, --yes` | Skip confirmation prompts | `false` |
| `--json` | Print the analysis as JSON | `false` |

### Tiers

| Tier | Scale |
| --- | --- |
| `exact` | 100% of the exact rendered size |
| `safe` | 90% |
| `aggressive` | 75% |
| `extreme` | 50% |
| number | Custom percentage, e.g. `--tier 85` |

## Development

```bash
npm install
npm run dev -- ./dist --dry-run --browser chrome
npm run typecheck
npm test
npm run build
```

## License

MIT
