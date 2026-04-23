import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const runtimeHomePath = path.resolve("index.html");

const VIEWPORTS = [
  { width: 390, height: 844, name: "390" },
  { width: 1512, height: 900, name: "1512" },
  { width: 1919, height: 900, name: "1919" },
  { width: 1920, height: 900, name: "1920" },
  { width: 2560, height: 900, name: "2560" }
] as const;

test("visual smoke captures screenshots for wide viewport set", async ({ page }) => {
  test.setTimeout(60_000);
  const outputDir = path.resolve("artifacts/smoke");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`file://${runtimeHomePath}`);
    await expect(page.locator("main#main-content")).toBeVisible();

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot.byteLength).toBeGreaterThan(5_000);
    fs.writeFileSync(path.join(outputDir, `home-visual-${viewport.name}.png`), screenshot);
  }
});
