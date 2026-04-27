import { test, expect } from "@playwright/test";
import { runtimeHomeUrl } from "./runtime-home";

test.describe("footer sticky reveal (main stacks above footer)", () => {
  for (const viewport of [
    { width: 390, height: 600, name: "390x600" },
    { width: 390, height: 700, name: "390x700" },
    { width: 390, height: 844, name: "390x844" },
    { width: 1512, height: 900, name: "1512" },
    { width: 1920, height: 900, name: "1920" }
  ] as const) {
    test(`viewport-fit reveal at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(runtimeHomeUrl, { waitUntil: "load" });
      await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()));

      const layers = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const main = document.querySelector("main#main-content");
        const footer = document.querySelector("footer#contact");
        const wrapper = document.querySelector(".footer__wrapper");
        if (!main || !footer || !wrapper) {
          throw new Error("main, footer, or wrapper missing");
        }
        const mainCs = getComputedStyle(main);
        const footerCs = getComputedStyle(footer);
        const footerRect = footer.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        const viewportHeight = (window.visualViewport && window.visualViewport.height) || window.innerHeight;

        return {
          hasFooterTall: document.documentElement.hasAttribute("data-footer-tall"),
          layerMain: Number.parseInt(root.getPropertyValue("--layer-main").trim(), 10),
          layerFooterUnder: Number.parseInt(root.getPropertyValue("--layer-footer-under").trim(), 10),
          mainZ: Number.parseInt(mainCs.zIndex, 10),
          footerZ: Number.parseInt(footerCs.zIndex, 10),
          mainPosition: mainCs.position,
          footerPosition: footerCs.position,
          footerTopStyle: footerCs.top,
          footerBottomStyle: footerCs.bottom,
          footerHeight: footerRect.height,
          wrapperHeight: wrapperRect.height,
          viewportHeight
        };
      });

      expect(layers.layerMain).toBeGreaterThan(layers.layerFooterUnder);
      expect(layers.mainZ).toBe(layers.layerMain);
      expect(layers.footerZ).toBe(layers.layerFooterUnder);
      expect(layers.mainPosition).toBe("relative");
      expect(layers.footerPosition).toBe("sticky");
      expect(layers.footerTopStyle).toBe("auto");
      expect(layers.footerBottomStyle).toBe("0px");
      expect(layers.hasFooterTall).toBe(false);
      expect(Math.abs(layers.footerHeight - layers.viewportHeight)).toBeLessThanOrEqual(2);
      expect(Math.abs(layers.wrapperHeight - layers.viewportHeight)).toBeLessThanOrEqual(2);

      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });

      const end = await page.evaluate(() => {
        const footer = document.querySelector("footer#contact");
        const footerMsg = document.querySelector(".footer__message");
        const footerMeta = document.querySelector(".footer__meta");
        const footerModel = document.querySelector(".footer__model");
        if (!footer || !footerMsg || !footerMeta || !footerModel) {
          throw new Error("footer, message, meta, or model missing");
        }

        const footerRect = footer.getBoundingClientRect();
        const msgRect = footerMsg.getBoundingClientRect();
        const metaRect = footerMeta.getBoundingClientRect();
        const modelRect = footerModel.getBoundingClientRect();
        const viewportHeight = (window.visualViewport && window.visualViewport.height) || window.innerHeight;

        return {
          footerTop: footerRect.top,
          footerBottom: footerRect.bottom,
          msgTop: msgRect.top,
          msgBottom: msgRect.bottom,
          metaTop: metaRect.top,
          metaBottom: metaRect.bottom,
          modelTop: modelRect.top,
          modelBottom: modelRect.bottom,
          viewportHeight
        };
      });

      expect(Math.abs(end.footerTop)).toBeLessThanOrEqual(2);
      expect(Math.abs(end.footerBottom - end.viewportHeight)).toBeLessThanOrEqual(2);
      expect(end.msgTop).toBeGreaterThanOrEqual(0);
      expect(end.msgBottom).toBeLessThanOrEqual(end.viewportHeight);
      expect(end.metaTop).toBeGreaterThanOrEqual(0);
      expect(end.metaBottom).toBeLessThanOrEqual(end.viewportHeight);
      expect(end.modelTop).toBeLessThan(end.viewportHeight);
      expect(end.modelBottom).toBeGreaterThan(0);

      if (viewport.name === "1512") {
        await page.waitForFunction(() => document.documentElement.classList.contains("is-project-stage-detached"), {
          timeout: 5000
        });

        const detached = await page.evaluate(() => {
          const sh = document.querySelector(".project-background-stage-shell");
          const curves = document.querySelector("[data-project=\"curves\"]");
          return {
            isDetached: document.documentElement.classList.contains("is-project-stage-detached"),
            shellAlpha: sh ? Number.parseFloat(getComputedStyle(sh).opacity) : null,
            curvesBg: curves ? getComputedStyle(curves).backgroundColor : null
          };
        });
        expect(detached.isDetached).toBe(true);
        expect(detached.shellAlpha).toBe(0);
        if (typeof detached.curvesBg === "string" && /^rgba\(/i.test(detached.curvesBg)) {
          const m = detached.curvesBg.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
          const a = m ? Number.parseFloat(m[1]) : 1;
          expect(a).toBeGreaterThan(0);
        }
      }
    });
  }
});
