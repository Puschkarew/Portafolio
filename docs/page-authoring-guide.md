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

When you add illustrations or large media inside `.case-content`, treat **[`docs/case-illustration-animation.md`](case-illustration-animation.md)** as the spec for scroll-driven reveal: reuse established classes (for example `.case-reference-illustration`, `.case-reference-item`) or extend [`scripts/scroll-reveal.js`](../scripts/scroll-reveal.js) if you introduce a new wrapper pattern — do not assume `<img>` blocks animate without matching that system.

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

The shared layout currently uses root-relative CSS, script, and shared asset paths such as `/styles/...`, `/scripts/...`, and `/assets/...`. Keep page-local asset paths consistent with the surrounding markup, and verify nested routes through an HTTP server.

Do not verify generated pages by opening HTML files directly through Finder or `file://...`; root-relative paths can resolve outside the project and make the page appear unstyled. Use `npm run dev` for normal checks, or serve the built `dist/` folder over HTTP before opening it in a browser.
