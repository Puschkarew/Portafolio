import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { runtimeHomeUrl } from "./runtime-home";

const outputDir = path.resolve("artifacts/smoke");
const runtimeAboutUrl = process.env.RUNTIME_ABOUT_URL ?? "http://127.0.0.1:4173/about/";

const VIEWPORTS = [
  { width: 390, height: 844, name: "390" },
  { width: 1512, height: 900, name: "1512" },
  { width: 1920, height: 900, name: "1920" },
  { width: 2560, height: 900, name: "2560" }
] as const;

type TokenExpectation = {
  selector: string;
  role: "label" | "body" | "section-title" | "button" | "card-meta";
  familyIncludes: string;
  weight: string;
  sizePx: number;
  lineHeightPx: number;
  letterSpacingPx: number;
};

const desktopExpectations: TokenExpectation[] = [
  {
    selector: ".hero__caption",
    role: "label",
    familyIncludes: "American Grotesk",
    weight: "400",
    sizePx: 16,
    lineHeightPx: 22,
    letterSpacingPx: 0.5
  },
  {
    selector: ".hero__description",
    role: "body",
    familyIncludes: "Society Trial",
    weight: "400",
    sizePx: 20,
    lineHeightPx: 30,
    letterSpacingPx: 0.5
  },
  {
    selector: ".section-title",
    role: "section-title",
    familyIncludes: "American Grotesk",
    weight: "500",
    sizePx: 72,
    lineHeightPx: 80,
    letterSpacingPx: -0.01
  },
  {
    selector: ".nav-link",
    role: "button",
    familyIncludes: "American Grotesk",
    weight: "400",
    sizePx: 16,
    lineHeightPx: 22,
    letterSpacingPx: 0.5
  },
  {
    selector: ".section-header__meta",
    role: "card-meta",
    familyIncludes: "American Grotesk",
    weight: "400",
    sizePx: 16,
    lineHeightPx: 22,
    letterSpacingPx: 0.5
  }
];

const mobileOverrides = new Map<string, Pick<TokenExpectation, "sizePx" | "lineHeightPx" | "letterSpacingPx">>([
  [".hero__description", { sizePx: 18, lineHeightPx: 26, letterSpacingPx: 0.5 }],
  [".section-title", { sizePx: 48, lineHeightPx: 56, letterSpacingPx: -0.01 }]
]);

function toPx(value: string): number {
  if (value === "normal") return 0;
  return Number.parseFloat(value.replace("px", ""));
}

function toleranceFor(property: "size" | "line-height" | "letter-spacing"): number {
  if (property === "letter-spacing") return 0.2;
  return 0.1;
}

test("token-semantic smoke validates critical type roles", async ({ page }) => {
  fs.mkdirSync(outputDir, { recursive: true });
  const report: Record<string, Array<Record<string, string | number>>> = {};

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(runtimeHomeUrl);
    await expect(page.locator("main#main-content")).toBeVisible();

    const viewportRows: Array<Record<string, string | number>> = [];

    for (const entry of desktopExpectations) {
      const locator = page.locator(entry.selector).first();
      await expect(locator, `Missing role ${entry.role} for selector ${entry.selector}`).toBeVisible();

      const styles = await locator.evaluate((el) => {
        const computed = getComputedStyle(el);
        return {
          fontFamily: computed.fontFamily,
          fontWeight: computed.fontWeight,
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing
        };
      });

      const mobileOverride = viewport.width <= 767 ? mobileOverrides.get(entry.selector) : undefined;
      const expectedSize = mobileOverride?.sizePx ?? entry.sizePx;
      const expectedLineHeight = mobileOverride?.lineHeightPx ?? entry.lineHeightPx;
      const expectedLetterSpacing = mobileOverride?.letterSpacingPx ?? entry.letterSpacingPx;

      const actualSize = toPx(styles.fontSize);
      const actualLineHeight = toPx(styles.lineHeight);
      const actualLetterSpacing = toPx(styles.letterSpacing);

      expect(styles.fontFamily).toContain(entry.familyIncludes);
      expect(styles.fontWeight).toBe(entry.weight);
      expect(Math.abs(actualSize - expectedSize)).toBeLessThanOrEqual(toleranceFor("size"));
      expect(Math.abs(actualLineHeight - expectedLineHeight)).toBeLessThanOrEqual(
        toleranceFor("line-height")
      );
      expect(Math.abs(actualLetterSpacing - expectedLetterSpacing)).toBeLessThanOrEqual(
        toleranceFor("letter-spacing")
      );

      viewportRows.push({
        selector: entry.selector,
        role: entry.role,
        expectedFontFamily: entry.familyIncludes,
        actualFontFamily: styles.fontFamily,
        expectedFontWeight: entry.weight,
        actualFontWeight: styles.fontWeight,
        expectedFontSizePx: expectedSize,
        actualFontSizePx: Number(actualSize.toFixed(2)),
        expectedLineHeightPx: expectedLineHeight,
        actualLineHeightPx: Number(actualLineHeight.toFixed(2)),
        expectedLetterSpacingPx: expectedLetterSpacing,
        actualLetterSpacingPx: Number(actualLetterSpacing.toFixed(2)),
        toleranceSizePx: toleranceFor("size"),
        toleranceLineHeightPx: toleranceFor("line-height"),
        toleranceLetterSpacingPx: toleranceFor("letter-spacing")
      });
    }

    report[viewport.name] = viewportRows;
  }

  fs.writeFileSync(path.join(outputDir, "home-token-semantic.json"), JSON.stringify(report, null, 2));
});

test("about page uses Body/LG underline for table links", async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(runtimeAboutUrl);
    await expect(page.locator("main#main-content")).toBeVisible();

    const locator = page.locator(".about-table__link.type-body-lg-underline").first();
    await expect(locator).toBeVisible();

    const styles = await locator.evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textDecorationLine: computed.textDecorationLine
      };
    });

    const expectedSize = viewport.width <= 767 ? 18 : 20;
    const expectedLineHeight = viewport.width <= 767 ? 26 : 30;

    expect(styles.fontFamily).toContain("Society Trial");
    expect(styles.fontWeight).toBe("400");
    expect(styles.fontStyle).toBe("normal");
    expect(Math.abs(toPx(styles.fontSize) - expectedSize)).toBeLessThanOrEqual(toleranceFor("size"));
    expect(Math.abs(toPx(styles.lineHeight) - expectedLineHeight)).toBeLessThanOrEqual(
      toleranceFor("line-height")
    );
    expect(Math.abs(toPx(styles.letterSpacing) - 0.5)).toBeLessThanOrEqual(
      toleranceFor("letter-spacing")
    );
    expect(styles.textDecorationLine).toContain("underline");
  }
});
