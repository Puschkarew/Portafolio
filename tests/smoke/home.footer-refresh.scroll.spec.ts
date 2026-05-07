import { test, expect } from "@playwright/test";
import { runtimeHomeUrl } from "./runtime-home";

type ScrubState = {
  mode: string;
  transitionPx: number;
  projects: { id: string; startY: number }[];
  pair: { from: string; to: string; t: number };
  displayId: string;
};

test.describe("refresh at footer: scroll up restores stage without stale inlines", () => {
  test.use({ viewport: { width: 1512, height: 900 } });
  test.skip(({ browserName }) => browserName !== "chromium", "Footer reload scroll restoration is only asserted in Chromium.");

  test("reload at max scroll, scroll up, stage opacities match scrub and shell visible", async ({ page }) => {
    await page.goto(runtimeHomeUrl, { waitUntil: "load" });
    await page.waitForFunction(
      () => typeof (window as unknown as { __portfolioProjectScrub?: { getState: () => ScrubState } }).__portfolioProjectScrub !== "undefined",
      null,
      { timeout: 10_000 }
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState()
          .projects.length === 4
    );
    const baselineProjects = await page.evaluate(() => {
      return (
        window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }
      ).__portfolioProjectScrub.getState().projects;
    });

    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(150);

    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(
      () => typeof (window as unknown as { __portfolioProjectScrub?: { getState: () => ScrubState } }).__portfolioProjectScrub !== "undefined",
      null,
      { timeout: 10_000 }
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState()
          .projects.length === 4
    );
    /* Restored scroll should land near the bottom. */
    await page.waitForFunction(
      () => window.scrollY > document.documentElement.scrollHeight * 0.25,
      null,
      { timeout: 8000 }
    );

    const afterReload = await page.evaluate(() => {
      const sh = document.querySelector(".project-background-stage-shell");
      return {
        detached: document.documentElement.classList.contains("is-project-stage-detached"),
        scrub: (
          window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }
        ).__portfolioProjectScrub.getState(),
        y: window.scrollY,
        shellAlpha: sh ? Number.parseFloat(getComputedStyle(sh).opacity) : null
      };
    });
    expect(afterReload.detached).toBe(true);
    expect(afterReload.shellAlpha).toBe(0);
    expect(afterReload.scrub.projects.map((project) => project.id)).toEqual(
      baselineProjects.map((project) => project.id)
    );
    for (const [index, project] of afterReload.scrub.projects.entries()) {
      expect(project.startY).toBeCloseTo(baselineProjects[index].startY, 0);
    }

    /* Scroll up until the stage is attached again (undetach). */
    await page.evaluate(async () => {
      for (let i = 0; i < 30; i += 1) {
        if (!document.documentElement.classList.contains("is-project-stage-detached")) {
          return;
        }
        window.scrollBy(0, -100);
        await new Promise<void>((r) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              r();
            });
          });
        });
      }
    });

    const afterScroll = await page.evaluate(() => {
      return new Promise<{
        detached: boolean;
        scrub: ScrubState;
        shellAlpha: number | null;
        artOpacitySum: number;
        allArtsHaveInlineOpacity: boolean;
        bgOpacitySum: number;
        bgOpacities: Record<string, number>;
        artOpacities: Record<string, number>;
      }>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const scrub = (
              window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }
            ).__portfolioProjectScrub.getState();
            const detached = document.documentElement.classList.contains("is-project-stage-detached");
            const sh = document.querySelector(".project-background-stage-shell");
            const shellAlpha = sh ? Number.parseFloat(getComputedStyle(sh).opacity) : null;
            const arts = document.querySelectorAll<HTMLElement>(".project-background-stage [data-art-for]");
            let artOpacitySum = 0;
            let allArtsHaveInlineOpacity = true;
            const artOpacities: Record<string, number> = {};
            for (const ar of arts) {
              const o = ar.style.opacity;
              const id = ar.getAttribute("data-art-for") || "";
              if (o === "") {
                allArtsHaveInlineOpacity = false;
              } else {
                const parsed = Number.parseFloat(o) || 0;
                artOpacitySum += parsed;
                artOpacities[id] = parsed;
              }
            }
            const bgs = document.querySelectorAll<HTMLElement>(".project-background-stage [data-bg-layer]");
            let bgOpacitySum = 0;
            const bgOpacities: Record<string, number> = {};
            for (const bg of bgs) {
              const id = bg.getAttribute("data-bg-layer") || "";
              const parsed = Number.parseFloat(bg.style.opacity) || 0;
              bgOpacitySum += parsed;
              bgOpacities[id] = parsed;
            }
            resolve({
              detached,
              scrub,
              shellAlpha,
              artOpacitySum,
              allArtsHaveInlineOpacity,
              bgOpacitySum,
              bgOpacities,
              artOpacities
            });
          });
        });
      });
    });

    expect(afterScroll.detached).toBe(false);
    expect(afterScroll.shellAlpha).toBe(1);
    expect(afterScroll.scrub.mode).toBe("desktop");
    expect(afterScroll.allArtsHaveInlineOpacity).toBe(true);
    expect(afterScroll.artOpacitySum).toBeCloseTo(1, 5);
    expect(afterScroll.bgOpacitySum).toBeCloseTo(1, 5);
    expect(afterScroll.scrub.pair.from).toBe("odds");
    expect(afterScroll.scrub.pair.to).toBe("curves");
    expect(afterScroll.scrub.pair.t).toBeCloseTo(1, 5);
    expect(afterScroll.bgOpacities.odds).toBeCloseTo(0, 5);
    expect(afterScroll.bgOpacities.curves).toBeCloseTo(1, 5);
    expect(afterScroll.artOpacities.odds).toBeCloseTo(0, 5);
    expect(afterScroll.artOpacities.curves).toBeCloseTo(1, 5);
  });
});
