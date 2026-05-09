# Portfolio

Hand-coded portfolio site generated with Eleventy. Source templates live in `src/`; generated output lives in `dist/` and should not be edited directly.

## Setup

```sh
npm ci
```

Use the Node version from `.nvmrc`.

## Development

```sh
npm run dev
```

Open the local HTTP URL printed by Eleventy. Do not open `dist/index.html` directly because root-relative assets need an HTTP server.

## Production Builds

```sh
npm run build
npm run build-ghpages
```

`npm run build` creates the normal local production output. `npm run build-ghpages` builds with the `/Portafolio/` path prefix used by GitHub Pages.

Both production builds run `scripts/quality/optimize-large-assets.mjs` after Eleventy. The repository still keeps the original large Figma/media sources for now, but generated output rewrites known oversized references to optimized files under `dist/assets/optimized/` and removes replaced originals from `dist/`.

## Validation

```sh
npm run lint:quality
npm run smoke
```

The smoke suite covers visual checks, accessibility, token semantics, project sticky transitions, mobile menu behavior, and performance metrics.

For focused checks:

```sh
npm run smoke:projects
npm run smoke:mobile
npm run smoke:footer
```

## Deployment

GitHub Pages deployment runs from `.github/workflows/quality-gates.yml`. The Pages artifact is built and deployed only after the quality gate job confirms that contract checks and the relevant smoke path passed.

Runtime assets are not moved to Git LFS in this phase because GitHub Pages does not serve Git LFS-backed site assets.
