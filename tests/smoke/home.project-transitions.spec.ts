import { test, expect } from "@playwright/test";
import path from "node:path";

const runtimeHomePath = path.resolve("index.html");

type ScrubState = {
  mode: string;
  transitionPx: number;
  projects: { id: string; startY: number }[];
  pair: { from: string; to: string; t: number };
};

test.describe("home project scroll transitions (desktop stage)", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("debug hook, 50vh transition, pair + blur on scrub", async ({ page }) => {
    await page.goto(`file://${runtimeHomePath}`, { waitUntil: "load" });
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

    const s0 = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState();
    });
    expect(s0.mode).toBe("desktop");
    expect(s0.transitionPx).toBe(900 * 0.5);

    const projects = s0.projects;
    expect(projects.map((p) => p.id)).toEqual(["featured", "madebymad", "odds", "curves"]);
    const sFeat = projects[0].startY;
    const sMad = projects[1].startY;
    const T = s0.transitionPx;

    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, sFeat - 10);
    let pair = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState().pair;
    });
    expect(pair.t).toBe(0);

    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, sFeat + T * 0.5);
    await page.waitForFunction(
      (y) => {
        return Math.abs(window.scrollY - (y as number)) < 2;
      },
      sFeat + T * 0.5
    );
    await new Promise((r) => {
      setTimeout(r, 100);
    });
    pair = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState().pair;
    });
    expect(pair.t).toBeCloseTo(0.5, 1);

    /* Just below s0+T: t→1 (prelude→featured). At exactly s0+T the state becomes (featured, madebymad) t=0 — same art layers. */
    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, sFeat + T - 1);
    await new Promise((r) => setTimeout(r, 100));
    pair = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState().pair;
    });
    expect(pair.from).toBe("prelude");
    expect(pair.to).toBe("featured");
    expect(pair.t).toBeCloseTo(1, 1);

    /* Halfway between end of first 50vh window and start of madebymad: settled (featured, madebymad) t=0. */
    const ySettledFbm = sFeat + T + (sMad - (sFeat + T)) * 0.5;
    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, ySettledFbm);
    await new Promise((r) => setTimeout(r, 100));
    const tLo = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState().pair.t;
    });
    expect(tLo).toBe(0);

    const sMadebymad = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState().projects[1]
        .startY;
    });
    const yMidFbm = sMadebymad + T * 0.5;
    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, yMidFbm);
    await new Promise((r) => setTimeout(r, 100));
    const tMidF = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState().pair;
    });
    expect(tMidF.from).toBe("featured");
    expect(tMidF.to).toBe("madebymad");
    expect(tMidF.t).toBeCloseTo(0.5, 1);

    const artBlurF = await page.evaluate(() => {
      const a = document.querySelector('[data-art-for="featured"]') as HTMLElement | null;
      const b = document.querySelector('[data-art-for="madebymad"]') as HTMLElement | null;
      if (!a || !b) {
        return { af: 0, bf: 0 };
      }
      const aBlur = a.style.getPropertyValue("--project-art-blur") || getComputedStyle(a).getPropertyValue("--project-art-blur");
      const bBlur = b.style.getPropertyValue("--project-art-blur") || getComputedStyle(b).getPropertyValue("--project-art-blur");
      return {
        af: Number.parseFloat(aBlur) || 0,
        bf: Number.parseFloat(bBlur) || 0
      };
    });
    expect(artBlurF.af).toBeCloseTo(16, 0);
    expect(artBlurF.bf).toBeCloseTo(16, 0);
  });

  test("no html data-header-theme at madebymad pre-sticky, odds pre-sticky, odds mid transition", async ({ page }) => {
    await page.goto(`file://${runtimeHomePath}`, { waitUntil: "load" });
    await page.waitForFunction(
      () => typeof (window as unknown as { __portfolioProjectScrub?: { getState: () => ScrubState } }).__portfolioProjectScrub !== "undefined",
      null,
      { timeout: 10_000 }
    );
    await page.waitForFunction(
      () =>
        (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState().projects
          .length === 4
    );

    const s0 = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState();
    });
    const T = s0.transitionPx;
    const sMadebymad = s0.projects[1].startY;
    const sOdds = s0.projects[2].startY;

    const readHeaderThemePresence = () =>
      page.evaluate(() => {
        return {
          hasHeaderTheme: document.documentElement.hasAttribute("data-header-theme"),
          themedNodeCount: document.querySelectorAll("[data-header-theme]").length
        };
      });

    for (const y of [sMadebymad - 10, sOdds - 10, sOdds + T * 0.5]) {
      await page.evaluate((yy) => {
        window.scrollTo(0, yy);
      }, y);
      await new Promise((r) => {
        setTimeout(r, 100);
      });
      const snap = await readHeaderThemePresence();
      expect(snap.hasHeaderTheme, `at scrollY ${y}`).toBe(false);
      expect(snap.themedNodeCount, `at scrollY ${y}`).toBe(0);
    }
  });
});
