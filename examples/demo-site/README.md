# ViewFit demo site

A small static site with `<img>` elements, a CSS `background-image`, repeated assets and responsive layout changes between desktop and mobile.

## Generate the assets

The images are committed, but you can regenerate them:

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

Desktop report only:

```bash
node dist/cli.js ./examples/demo-site --browser chrome --dry-run
```

Mobile report with a custom 80% tier:

```bash
node dist/cli.js ./examples/demo-site --browser chrome --device mobile --tier 80 --dry-run
```

Write optimized images to a folder:

```bash
node dist/cli.js ./examples/demo-site --browser chrome \
  --output examples/demo-site/optimized --tier aggressive --yes
```

Overwrite the originals (same format):

```bash
node dist/cli.js ./examples/demo-site --browser chrome --write --yes
```

ViewFit serves the folder automatically, so you do not need to start a server yourself. To open the original site in a browser:

```bash
open examples/demo-site/index.html
```
