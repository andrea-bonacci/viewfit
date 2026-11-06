# ViewFit demo site

Two static pages with five intentionally heavy images (about 21 MB total):

- `index.html` — full-width hero plus a CSS `background-image`
- `gallery.html` — large hero, the same product image reused three times and a large PNG icon

## Generate the assets

The heavy images are committed, but you can regenerate them:

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

## Asset sizes

| File | Dimensions | Weight |
| --- | --- | --- |
| `hero.jpg` | 4000 × 2600 | ~5.5 MB |
| `banner.jpg` | 3200 × 1800 | ~3.1 MB |
| `gallery.jpg` | 3600 × 2400 | ~4.8 MB |
| `product.jpg` | 2400 × 2400 | ~2.5 MB |
| `thumb.png` | 1200 × 1200 | ~2.7 MB |
