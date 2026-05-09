import { test, expect, type Page } from "@playwright/test";
import { runtimeHomeUrl } from "./runtime-home";

type ScrubState = {
  mode: string;
  transitionPx: number;
  projects: { id: string; startY: number }[];
  pair: { from: string; to: string; t: number };
};

async function readScrubState(page: Page) {
  return page.evaluate(() => {
    return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState();
  });
}

async function scrollToAndWait(page: Page, y: number) {
  await page.evaluate((targetY) => {
    window.scrollTo(0, targetY);
  }, y);
  await page.waitForFunction(
    (targetY) => {
      return Math.abs(window.scrollY - (targetY as number)) < 2;
    },
    y
  );
}

async function scrollToAndWaitForPair(
  page: Page,
  y: number,
  expected: { from: string; to: string; t?: number; precision?: number }
) {
  await scrollToAndWait(page, y);
  await expect
    .poll(
      async () => {
        const state = await readScrubState(page);
        return `${state.pair.from}->${state.pair.to}`;
      },
      { timeout: 3_000 }
    )
    .toBe(`${expected.from}->${expected.to}`);

  if (typeof expected.t === "number") {
    await expect
      .poll(
        async () => {
          const state = await readScrubState(page);
          return state.pair.t;
        },
        { timeout: 3_000 }
      )
      .toBeCloseTo(expected.t, expected.precision ?? 1);
  }

  return (await readScrubState(page)).pair;
}

test.describe("home project scroll transitions (desktop stage)", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("debug hook, 50vh transition, pair + blur on scrub", async ({ page }) => {
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

    const s0 = await readScrubState(page);
    expect(s0.mode).toBe("desktop");
    expect(s0.transitionPx).toBe(900 * 0.5);

    const projects = s0.projects;
    const domProjectIds = await page.evaluate(() =>
      [...document.querySelectorAll(".projects-area section[data-project]")].map((el) => el.getAttribute("data-project"))
    );
    expect(projects.map((p) => p.id)).toEqual(domProjectIds);
    expect(projects.map((p) => p.id)).toEqual(["featured", "madebymad", "odds", "curves"]);
    const sFeat = projects[0].startY;
    const sMad = projects[1].startY;
    const T = s0.transitionPx;

    let pair = await scrollToAndWaitForPair(page, sFeat - 10, { from: "prelude", to: "featured", t: 0 });
    expect(pair.t).toBe(0);

    pair = await scrollToAndWaitForPair(page, sFeat + T * 0.5, { from: "prelude", to: "featured", t: 0.5 });
    expect(pair.t).toBeCloseTo(0.5, 1);

    /* Just below s0+T: t→1 (prelude→featured). At exactly s0+T the state becomes (featured, madebymad) t=0 — same art layers. */
    pair = await scrollToAndWaitForPair(page, sFeat + T - 1, { from: "prelude", to: "featured", t: 1 });
    expect(pair.from).toBe("prelude");
    expect(pair.to).toBe("featured");
    expect(pair.t).toBeCloseTo(1, 1);

    /* Halfway between end of first 50vh window and start of madebymad: settled (featured, madebymad) t=0. */
    const ySettledFbm = sFeat + T + (sMad - (sFeat + T)) * 0.5;
    pair = await scrollToAndWaitForPair(page, ySettledFbm, { from: "featured", to: "madebymad", t: 0 });
    expect(pair.t).toBe(0);

    const sMadebymad = (await readScrubState(page)).projects[1].startY;
    const yMidFbm = sMadebymad + T * 0.5;
    const tMidF = await scrollToAndWaitForPair(page, yMidFbm, { from: "featured", to: "madebymad", t: 0.5 });
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
    await page.goto(runtimeHomeUrl, { waitUntil: "load" });
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

test.describe("home project scroll transitions (mobile stage)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile uses shared stage with 50vh scrub, art blur, and text interpolation", async ({ page }) => {
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

    const s0 = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState();
    });
    expect(s0.mode).toBe("mobile");
    expect(s0.transitionPx).toBe(844 * 0.5);
    expect(s0.projects.map((p) => p.id)).toEqual(["featured", "madebymad", "odds", "curves"]);

    const sFeat = s0.projects[0].startY;
    const sMadebymad = s0.projects[1].startY;
    const T = s0.transitionPx;
    const readMobileStage = () =>
      page.evaluate(() => {
        const root = document.documentElement;
        const featuredLayer = document.querySelector('[data-bg-layer="featured"]') as HTMLElement | null;
        const featuredArt = document.querySelector('[data-art-for="featured"]') as HTMLElement | null;
        const localArt = document.querySelector('[data-project="featured"] .section-header__art') as HTMLElement | null;
        const header = document.querySelector('[data-project="featured"] .section-header') as HTMLElement | null;
        return {
          hasScrub: root.classList.contains("has-project-sticky-scrub"),
          headerPosition: header ? getComputedStyle(header).position : "",
          localArtOpacity: localArt ? getComputedStyle(localArt).opacity : "",
          layerOpacity: featuredLayer ? Number.parseFloat(featuredLayer.style.opacity || getComputedStyle(featuredLayer).opacity) : 0,
          blur: featuredArt
            ? Number.parseFloat(
                featuredArt.style.getPropertyValue("--project-art-blur") ||
                  getComputedStyle(featuredArt).getPropertyValue("--project-art-blur")
              ) || 0
            : 0
        };
      });

    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, sFeat - 10);
    await new Promise((r) => {
      setTimeout(r, 100);
    });
    const before = await readMobileStage();
    expect(before.hasScrub).toBe(true);
    expect(before.headerPosition).toBe("sticky");
    expect(before.localArtOpacity).toBe("0");

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

    const midState = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState();
    });
    expect(midState.pair.from).toBe("prelude");
    expect(midState.pair.to).toBe("featured");
    expect(midState.pair.t).toBeCloseTo(0.5, 1);

    const mid = await readMobileStage();
    expect(mid.layerOpacity).toBeCloseTo(0.5, 1);
    expect(mid.blur).toBeCloseTo(16, 0);

    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, sMadebymad - 10);
    await new Promise((r) => {
      setTimeout(r, 100);
    });
    const beforeMadMeta = await page.evaluate(() => {
      const meta = document.querySelector('[data-project="madebymad"] .section-header__meta') as HTMLElement | null;
      return meta ? getComputedStyle(meta).color : "";
    });

    await page.evaluate((y) => {
      window.scrollTo(0, y);
    }, sMadebymad + T * 0.5);
    await new Promise((r) => {
      setTimeout(r, 100);
    });
    const madMidState = await page.evaluate(() => {
      return (window as unknown as { __portfolioProjectScrub: { getState: () => ScrubState } }).__portfolioProjectScrub.getState();
    });
    expect(madMidState.pair.from).toBe("featured");
    expect(madMidState.pair.to).toBe("madebymad");
    expect(madMidState.pair.t).toBeCloseTo(0.5, 1);

    const midMadMeta = await page.evaluate(() => {
      const meta = document.querySelector('[data-project="madebymad"] .section-header__meta') as HTMLElement | null;
      return meta ? getComputedStyle(meta).color : "";
    });
    expect(midMadMeta).not.toBe(beforeMadMeta);

    const textContract = await page.evaluate(() => {
      const section = document.querySelector('[data-project="madebymad"]') as HTMLElement | null;
      const title = section?.querySelector("h2.section-title") as HTMLElement | null;
      const body = section?.querySelector("p.prose.section-title") as HTMLElement | null;
      const meta = section?.querySelector("p.section-header__meta") as HTMLElement | null;
      return {
        titleInline: title?.style.color || "",
        bodyInline: body?.style.color || "",
        metaInline: meta?.style.color || "",
        titleVar: section?.style.getPropertyValue("--section-title-color") || "",
        bodyVar: section?.style.getPropertyValue("--section-body-color") || "",
        metaVar: section?.style.getPropertyValue("--section-meta-color") || ""
      };
    });
    expect(textContract.titleInline).toBe("");
    expect(textContract.bodyInline).toBe("");
    expect(textContract.metaInline).toBe("");
    expect(textContract.titleVar).not.toBe("");
    expect(textContract.bodyVar).not.toBe("");
    expect(textContract.metaVar).not.toBe("");
  });
});
