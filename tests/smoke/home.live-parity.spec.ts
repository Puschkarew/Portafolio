import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const runtimeUrl = process.env.LIVE_RUNTIME_URL ?? "http://127.0.0.1:4173/";
const slice = process.env.LIVE_PARITY_SLICE ?? "global";
const outputDir = path.resolve("artifacts/smoke");

const VIEWPORTS = [
  { width: 390, height: 844, name: "390" },
  { width: 1512, height: 900, name: "1512" },
  { width: 1920, height: 900, name: "1920" },
  { width: 2560, height: 900, name: "2560" }
] as const;

function assertSliceMetrics(
  currentSlice: string,
  viewportWidth: number,
  metrics: {
    heroOverlapArea: number;
    mainWidthRatio: number;
    heroContainerRatio: number;
    heroHeadlineRatio: number;
    projectsHeaderWidth: number;
    projectsGridRatio: number;
    footerMessageWidth: number;
    footerMessageRatio: number;
  }
): void {
  if (currentSlice === "hero") {
    const expectedHeroContainerRatio =
      viewportWidth <= 1920 ? 0.95 : 1920 / viewportWidth;
    expect(metrics.heroOverlapArea).toBe(0);
    expect(metrics.mainWidthRatio).toBeGreaterThanOrEqual(0.95);
    expect(metrics.heroContainerRatio).toBeGreaterThanOrEqual(
      expectedHeroContainerRatio - 0.01
    );
    if (viewportWidth <= 767) {
      expect(metrics.heroHeadlineRatio).toBeGreaterThanOrEqual(0.85);
    }
    return;
  }

  if (currentSlice === "projects") {
    const expectedHeaderMinWidth = viewportWidth <= 767 ? viewportWidth - 16 : 760;
    expect(metrics.projectsHeaderWidth).toBeGreaterThanOrEqual(expectedHeaderMinWidth);
    expect(metrics.projectsGridRatio).toBeGreaterThanOrEqual(0.98);
    return;
  }

  if (currentSlice === "footer") {
    if (viewportWidth <= 767) {
      expect(metrics.footerMessageRatio).toBeGreaterThanOrEqual(0.95);
    } else if (viewportWidth <= 1920) {
      expect(metrics.footerMessageRatio).toBeGreaterThanOrEqual(0.8);
    } else {
      expect(metrics.footerMessageRatio).toBeGreaterThanOrEqual(0.6);
    }
    expect(metrics.footerMessageWidth).toBeGreaterThanOrEqual(390);
    return;
  }

  // Global mode keeps broad hero-centric safeguards.
  const expectedHeroContainerRatio =
    viewportWidth <= 1920 ? 0.95 : 1920 / viewportWidth;
  expect(metrics.heroOverlapArea).toBe(0);
  expect(metrics.mainWidthRatio).toBeGreaterThanOrEqual(0.95);
  expect(metrics.heroContainerRatio).toBeGreaterThanOrEqual(
    expectedHeroContainerRatio - 0.01
  );
}

test("live parity captures local runtime evidence across viewports", async ({ page }) => {
  fs.mkdirSync(outputDir, { recursive: true });
  const report: Array<Record<string, string | number>> = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    try {
      await page.goto(runtimeUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    } catch (error) {
      throw new Error(
        `Live runtime is unavailable at ${runtimeUrl}. Start the local server and retry. Original error: ${String(error)}`
      );
    }

    await expect(page.locator("main#main-content")).toBeVisible();

    const layoutMetrics = await page.evaluate(() => {
      const headline = document.querySelector(".hero__headline");
      const profile = document.querySelector(".hero__profile");
      const heroContainer = document.querySelector(".section--hero .container");
      const main = document.querySelector("main#main-content");
      const projectsHeader = document.querySelector(".section--featured .section-header__content");
      const projectsGrid = document.querySelector(".cards-grid--schrift");
      const footerMessage = document.querySelector(".footer__message");

      if (!headline || !profile || !heroContainer || !main || !projectsHeader || !projectsGrid || !footerMessage) {
        throw new Error("Live parity metrics cannot be collected: required hero/main selectors are missing.");
      }

      const headlineRect = headline.getBoundingClientRect();
      const profileRect = profile.getBoundingClientRect();
      const heroContainerRect = heroContainer.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      const projectsHeaderRect = projectsHeader.getBoundingClientRect();
      const projectsGridRect = projectsGrid.getBoundingClientRect();
      const footerMessageRect = footerMessage.getBoundingClientRect();

      const intersectionWidth = Math.max(
        0,
        Math.min(headlineRect.right, profileRect.right) - Math.max(headlineRect.left, profileRect.left)
      );
      const intersectionHeight = Math.max(
        0,
        Math.min(headlineRect.bottom, profileRect.bottom) - Math.max(headlineRect.top, profileRect.top)
      );

      return {
        viewportWidth: window.innerWidth,
        mainWidth: mainRect.width,
        heroContainerWidth: heroContainerRect.width,
        heroHeadlineWidth: headlineRect.width,
        heroProfileWidth: profileRect.width,
        heroOverlapArea: intersectionWidth * intersectionHeight,
        projectsHeaderWidth: projectsHeaderRect.width,
        projectsGridWidth: projectsGridRect.width,
        footerMessageWidth: footerMessageRect.width
      };
    });

    const mainWidthRatio = layoutMetrics.mainWidth / layoutMetrics.viewportWidth;
    const heroContainerRatio = layoutMetrics.heroContainerWidth / layoutMetrics.viewportWidth;
    const headlineRatio = layoutMetrics.heroHeadlineWidth / layoutMetrics.viewportWidth;

    const projectsGridRatio = layoutMetrics.projectsGridWidth / layoutMetrics.viewportWidth;
    const footerMessageRatio = layoutMetrics.footerMessageWidth / layoutMetrics.viewportWidth;

    assertSliceMetrics(slice, layoutMetrics.viewportWidth, {
      heroOverlapArea: layoutMetrics.heroOverlapArea,
      mainWidthRatio,
      heroContainerRatio,
      heroHeadlineRatio: headlineRatio,
      projectsHeaderWidth: layoutMetrics.projectsHeaderWidth,
      projectsGridRatio,
      footerMessageWidth: layoutMetrics.footerMessageWidth,
      footerMessageRatio
    });

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.byteLength).toBeGreaterThan(5_000);

    const fileName = `home-live-${slice}-${viewport.name}.png`;
    fs.writeFileSync(path.join(outputDir, fileName), screenshot);

    report.push({
      slice,
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      file: path.join("artifacts/smoke", fileName),
      bytes: screenshot.byteLength,
      runtimeUrl,
      heroOverlapArea: layoutMetrics.heroOverlapArea,
      mainWidthRatio: Number(mainWidthRatio.toFixed(3)),
      heroContainerRatio: Number(heroContainerRatio.toFixed(3)),
      heroHeadlineRatio: Number(headlineRatio.toFixed(3)),
      projectsHeaderWidth: Number(layoutMetrics.projectsHeaderWidth.toFixed(2)),
      projectsGridRatio: Number(projectsGridRatio.toFixed(3)),
      footerMessageWidth: Number(layoutMetrics.footerMessageWidth.toFixed(2)),
      footerMessageRatio: Number(footerMessageRatio.toFixed(3))
    });
  }

  fs.writeFileSync(
    path.join(outputDir, `home-live-${slice}-report.json`),
    JSON.stringify({ slice, runtimeUrl, captures: report }, null, 2)
  );
});
