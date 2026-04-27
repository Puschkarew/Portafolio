# Page Authoring Guide

Use this guide when adding pages such as `about` or future project case pages.

## Basic Page Pattern

Create pages under `src/`. Prefer Nunjucks for pages that need shared layouts or future data-driven sections.

Minimum front matter:

```njk
---
layout: base.njk
title: Page Title
---
```

Add `permalink` when the output path must be explicit:

```njk
---
layout: base.njk
title: About
permalink: /about/
---
```

The generated page will use `src/_layouts/base.njk`, including the shared CSS links, footer, header layers, and scripts.

## About Page

- Create `src/about.njk`.
- Use `layout: base.njk`.
- Put only page-specific main content in the page file.
- Keep one visible `h1`.
- Reuse existing spacing, type, container, and section classes before adding new ones.

## Case Pages

For the first one or two case pages, start with direct Nunjucks markup and existing CSS conventions. Create a dedicated case layout only when repeated case structure becomes clear.

Add a case layout when at least two case pages share the same major structure, for example:

- case hero metadata;
- project role / year / scope blocks;
- repeated image or media modules;
- next-project navigation.

When that happens, create `src/_layouts/case.njk` and keep `base.njk` as the outer shell pattern. Do not move frozen header or footer markup into page-local files.

## Navigation And Frozen Markup

- The mobile `Menu` link is currently a placeholder that points to the work section. Do not build a menu overlay as part of page authoring unless the task explicitly asks for it.
- Do not change header DOM shape, fixed glass layers, or header script assumptions while adding pages.
- Do not change footer reveal markup while adding pages.
- When adding real routes, update navigation deliberately and verify anchors still work on the home page.

## Asset Paths

Use root-relative paths only if the deploy target requires them. The current site uses relative paths that work from generated pages such as `dist/index.html`; nested routes may require path decisions before release.

For now, if a new page is nested, verify images, styles, and scripts through `npm run dev`, not only by opening a file directly.
