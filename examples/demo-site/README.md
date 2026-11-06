# ViewFit demo site

Two static pages with six high-resolution Unsplash photos plus a heavy generated PNG icon (about 24 MB total):

- `index.html` — full-width hero, CSS `background-image`, and a 4655 × 3103 feature photo
- `gallery.html` — large hero, two portrait photos in a responsive card grid, and a heavy PNG icon reused four times

## Assets

| File | Dimensions | Weight | Source |
| --- | --- | --- | --- |
| `index-hero.jpg` | 5472 × 3648 | ~5.8 MB | Unsplash — Alina Chernovolova |
| `index-banner.jpg` | 5184 × 3888 | ~4.7 MB | Unsplash — Declan Sun |
| `index-feature.jpg` | 4655 × 3103 | ~1.9 MB | Unsplash — Nikoleta Marcineková |
| `gallery-hero.jpg` | 6000 × 4002 | ~2.3 MB | Unsplash — Daniel Sessler |
| `gallery-card-1.jpg` | 3902 × 5050 | ~2.1 MB | Unsplash — Brayden Law |
| `gallery-card-2.jpg` | 3734 × 5601 | ~3.8 MB | Unsplash — Wenhao Ruan |
| `thumb.png` | 1200 × 1200 | ~2.7 MB | generated |

Photos are used under the [Unsplash License](https://unsplash.com/license).

## Regenerate the icon

The photos are committed. Only the PNG icon is generated:

```bash
node examples/demo-site/generate-assets.mjs
```

## Try ViewFit

From the repository root:

```bash
npm install
npm run build
npx playwright install chromium   # or use --browser chrome
```

Home page, report only:

```bash
node dist/cli.js ./examples/demo-site/index.html --browser chrome --dry-run
```

Gallery page, report only:

```bash
node dist/cli.js ./examples/demo-site/gallery.html --browser chrome --dry-run
```

Gallery page on mobile with a custom 80% tier:

```bash
node dist/cli.js ./examples/demo-site/gallery.html --browser chrome \
  --device mobile --tier 80 --dry-run
```

Write optimized images to a folder:

```bash
node dist/cli.js ./examples/demo-site/gallery.html --browser chrome \
  --output examples/demo-site/optimized --tier aggressive --yes
```

ViewFit serves the folder automatically, so you do not need to start a server yourself. To open the site in a browser:

```bash
open examples/demo-site/index.html
open examples/demo-site/gallery.html
```
