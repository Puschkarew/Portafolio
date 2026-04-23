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

test("a11y/reflow smoke validates landmarks, skip-link and overflow across viewports", async ({
  page
}) => {
  const outputDir = path.resolve("artifacts/smoke");
  fs.mkdirSync(outputDir, { recursive: true });

  const results: Record<
    string,
    {
      landmarks: string[];
      skipLinkFocused: boolean;
      scrollWidth: number;
      clientWidth: number;
      horizontalOverflow: boolean;
    }
  > = {};

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`file://${runtimeHomePath}`);

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("nav[aria-label='Primary']")).toBeVisible();
    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeVisible();
    await skipLink.focus();
    const transform = await skipLink.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).not.toContain("-200");

    const dims = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));

    const horizontalOverflow = dims.scrollWidth > dims.clientWidth;
    if (horizontalOverflow) {
      throw new Error(
        `Horizontal overflow at viewport ${viewport.name}: scrollWidth=${dims.scrollWidth}, clientWidth=${dims.clientWidth}`
      );
    }

    results[viewport.name] = {
      landmarks: ["header", "nav[aria-label='Primary']", "main#main-content", "footer"],
      skipLinkFocused: true,
      scrollWidth: dims.scrollWidth,
      clientWidth: dims.clientWidth,
      horizontalOverflow
    };
  }

  fs.writeFileSync(path.join(outputDir, "home-a11y.json"), JSON.stringify(results, null, 2));
});
