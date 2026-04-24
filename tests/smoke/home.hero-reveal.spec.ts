import { test, expect } from "@playwright/test";
import path from "node:path";

const runtimeHomePath = path.resolve("index.html");

function alphaFromColor(color: string): number {
  const match = color.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
  return match ? Number.parseFloat(match[1]) : 1;
}

test.describe("hero sticky reveal (content stacks above hero)", () => {
  for (const viewport of [
    { width: 390, height: 800, name: "390x800" },
    { width: 1512, height: 900, name: "1512" },
    { width: 1920, height: 900, name: "1920" }
  ] as const) {
    test(`stacking + mid scroll at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`file://${runtimeHomePath}`, { waitUntil: "load" });
      await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()));

      await page.waitForFunction(
        () => {
          const hero = document.querySelector(".section--hero");
          if (!hero) {
            return false;
          }
          const heroHeight = hero.getBoundingClientRect().height;
          const viewportHeight = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
          const shouldBeTall = heroHeight > viewportHeight + 1;
          return shouldBeTall
            ? document.documentElement.hasAttribute("data-hero-tall")
            : !document.documentElement.hasAttribute("data-hero-tall");
        },
        { timeout: 5000 }
      );

      const layers = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const hero = document.querySelector(".section--hero");
        const work = document.querySelector("#work");
        const projects = document.querySelector(".projects-area");
        if (!hero || !work || !projects) {
          throw new Error("hero, work, or projects area missing");
        }

        const heroCs = getComputedStyle(hero);
        const workCs = getComputedStyle(work);
        const projectsCs = getComputedStyle(projects);
        const workBeforeCs = getComputedStyle(work, "::before");
        const heroHeight = hero.getBoundingClientRect().height;
        const viewportHeight = (window.visualViewport && window.visualViewport.height) || window.innerHeight;

        return {
          hasTall: document.documentElement.hasAttribute("data-hero-tall"),
          hasPast: document.documentElement.hasAttribute("data-hero-past-hero"),
          layerHeroUnder: Number.parseInt(root.getPropertyValue("--layer-hero-under").trim(), 10),
          layerAfterHero: Number.parseInt(root.getPropertyValue("--layer-after-hero").trim(), 10),
          heroPosition: heroCs.position,
          heroTop: Number.parseFloat(heroCs.top),
          heroHeight,
          viewportHeight,
          heroZ: Number.parseInt(heroCs.zIndex, 10),
          heroMinBlockSize: Number.parseFloat(heroCs.minBlockSize),
          workPosition: workCs.position,
          workZ: Number.parseInt(workCs.zIndex, 10),
          workBg: workCs.backgroundColor,
          projectsPosition: projectsCs.position,
          projectsZ: Number.parseInt(projectsCs.zIndex, 10),
          workBeforeContent: workBeforeCs.content,
          workBeforeBlockSize: Number.parseFloat(workBeforeCs.blockSize),
          workBeforeBackground: workBeforeCs.backgroundImage
        };
      });

      expect(layers.layerAfterHero).toBeGreaterThan(layers.layerHeroUnder);
      expect(layers.heroPosition).toBe("sticky");
      expect(layers.heroZ).toBe(layers.layerHeroUnder);
      expect(layers.heroMinBlockSize).toBe(0);
      expect(layers.workPosition).toBe("relative");
      expect(layers.workZ).toBe(layers.layerAfterHero);
      expect(layers.projectsPosition).toBe("relative");
      expect(layers.projectsZ).toBe(layers.layerAfterHero);
      expect(alphaFromColor(layers.workBg)).toBeGreaterThan(0);
      expect(layers.workBeforeContent).not.toBe("none");
      expect(layers.workBeforeBlockSize).toBeGreaterThan(0);
      expect(layers.workBeforeBackground).toContain("linear-gradient");
      expect(layers.hasPast).toBe(false);

      if (layers.hasTall) {
        const expectedStickyTop = layers.viewportHeight - layers.heroHeight;
        expect(layers.heroTop).toBeLessThan(0);
        expect(Math.abs(layers.heroTop - expectedStickyTop)).toBeLessThanOrEqual(1.5);

        const threshold = layers.heroHeight - layers.viewportHeight;
        await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, threshold - 2));
        await page.waitForFunction((y) => Math.abs(window.scrollY - (y as number)) < 2, Math.max(0, threshold - 2));

        const readPhase = await page.evaluate(() => {
          const hero = document.querySelector(".section--hero");
          const work = document.querySelector("#work");
          if (!hero || !work) {
            throw new Error("hero or work missing");
          }

          const heroRect = hero.getBoundingClientRect();
          const workRect = work.getBoundingClientRect();
          const overlap = Math.max(0, Math.min(heroRect.bottom, workRect.bottom) - Math.max(heroRect.top, workRect.top));

          return {
            heroBottom: heroRect.bottom,
            viewportHeight: (window.visualViewport && window.visualViewport.height) || window.innerHeight,
            workTop: workRect.top,
            overlap
          };
        });
        expect(readPhase.heroBottom).toBeGreaterThanOrEqual(readPhase.viewportHeight - 3);
        expect(readPhase.workTop).toBeGreaterThanOrEqual(readPhase.viewportHeight - 3);
        expect(readPhase.overlap).toBeLessThanOrEqual(1);

        await page.evaluate((y) => window.scrollTo(0, y), threshold);
        await page.waitForFunction((y) => Math.abs(window.scrollY - (y as number)) < 2, threshold);

        const thresholdPhase = await page.evaluate(() => {
          const hero = document.querySelector(".section--hero");
          const work = document.querySelector("#work");
          if (!hero || !work) {
            throw new Error("hero or work missing");
          }

          return {
            heroBottom: hero.getBoundingClientRect().bottom,
            viewportHeight: (window.visualViewport && window.visualViewport.height) || window.innerHeight,
            workTop: work.getBoundingClientRect().top
          };
        });
        expect(Math.abs(thresholdPhase.heroBottom - thresholdPhase.viewportHeight)).toBeLessThanOrEqual(2);
        expect(Math.abs(thresholdPhase.workTop - thresholdPhase.viewportHeight)).toBeLessThanOrEqual(2);

        await page.evaluate((y) => window.scrollTo(0, y), threshold + 80);
        await page.waitForFunction((y) => Math.abs(window.scrollY - (y as number)) < 2, threshold + 80);

        const overlapTall = await page.evaluate(() => {
          const hero = document.querySelector(".section--hero");
          const work = document.querySelector("#work");
          if (!hero || !work) {
            throw new Error("hero or work missing");
          }

          const heroRect = hero.getBoundingClientRect();
          const workRect = work.getBoundingClientRect();
          const y = Math.min(Math.max(workRect.top + 40, 120), window.innerHeight - 40);
          const x = window.innerWidth / 2;
          const topElement = document.elementFromPoint(x, y);

          return {
            heroBottom: heroRect.bottom,
            viewportHeight: (window.visualViewport && window.visualViewport.height) || window.innerHeight,
            workTop: workRect.top,
            workBottom: workRect.bottom,
            pointY: y,
            topIsWork: Boolean(topElement && topElement.closest("#work"))
          };
        });
        expect(Math.abs(overlapTall.heroBottom - overlapTall.viewportHeight)).toBeLessThanOrEqual(2);
        expect(overlapTall.workTop).toBeLessThan(viewport.height);
        expect(overlapTall.workBottom).toBeGreaterThan(overlapTall.pointY);
        expect(overlapTall.topIsWork).toBe(true);
        return;
      }

      expect(layers.heroTop).toBe(0);

      const overlap = await page.evaluate(() => {
        const hero = document.querySelector(".section--hero");
        const work = document.querySelector("#work");
        if (!hero || !work) {
          throw new Error("hero or work missing");
        }

        const heroHeight = hero.getBoundingClientRect().height;
        window.scrollTo(0, heroHeight * 0.65);

        const heroRect = hero.getBoundingClientRect();
        const workRect = work.getBoundingClientRect();
        const y = Math.min(Math.max(workRect.top + 40, 120), window.innerHeight - 40);
        const x = window.innerWidth / 2;
        const topElement = document.elementFromPoint(x, y);

        return {
          heroTop: heroRect.top,
          heroBottom: heroRect.bottom,
          workTop: workRect.top,
          workBottom: workRect.bottom,
          pointY: y,
          topIsWork: Boolean(topElement && topElement.closest("#work"))
        };
      });

      expect(overlap.heroTop).toBe(0);
      expect(overlap.heroBottom).toBeGreaterThan(overlap.pointY);
      expect(overlap.workTop).toBeLessThan(viewport.height);
      expect(overlap.workBottom).toBeGreaterThan(overlap.pointY);
      expect(overlap.topIsWork).toBe(true);
    });
  }
});
