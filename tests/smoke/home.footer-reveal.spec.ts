import { test, expect } from "@playwright/test";
import path from "node:path";

const runtimeHomePath = path.resolve("index.html");

test.describe("footer sticky reveal (main stacks above footer)", () => {
  for (const viewport of [
    { width: 390, height: 844, name: "390" },
    { width: 1512, height: 900, name: "1512" },
    { width: 1920, height: 900, name: "1920" }
  ] as const) {
    test(`stacking + end scroll at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`file://${runtimeHomePath}`, { waitUntil: "load" });

      const layers = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const main = document.querySelector("main#main-content");
        const footer = document.querySelector("footer#contact");
        if (!main || !footer) {
          throw new Error("main or footer missing");
        }
        const mainCs = getComputedStyle(main);
        const footerCs = getComputedStyle(footer);
        return {
          layerMain: Number.parseInt(root.getPropertyValue("--layer-main").trim(), 10),
          layerFooterUnder: Number.parseInt(root.getPropertyValue("--layer-footer-under").trim(), 10),
          mainZ: Number.parseInt(mainCs.zIndex, 10),
          footerZ: Number.parseInt(footerCs.zIndex, 10),
          mainPosition: mainCs.position,
          footerPosition: footerCs.position
        };
      });

      expect(layers.layerMain).toBeGreaterThan(layers.layerFooterUnder);
      expect(layers.mainZ).toBe(layers.layerMain);
      expect(layers.footerZ).toBe(layers.layerFooterUnder);
      expect(layers.mainPosition).toBe("relative");
      expect(layers.footerPosition).toBe("sticky");

      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });

      const footerMsg = page.locator(".footer__message");
      await expect(footerMsg).toBeVisible();
      const box = await footerMsg.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.y + box.height).toBeGreaterThan(0);
        expect(box.y).toBeLessThan(viewport.height);
      }
    });
  }
});
