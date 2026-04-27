import { test, expect } from "@playwright/test";
import { runtimeHomeUrl } from "./runtime-home";

test("mobile menu uses fixed visual blend text and locks page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 852 });
  await page.goto(runtimeHomeUrl);

  await page.locator(".site-header__hit-link").last().click({ force: true });
  await expect(page.locator(".mobile-menu")).toBeVisible();

  const state = await page.evaluate(() => {
    const menu = document.querySelector(".mobile-menu") as HTMLElement | null;
    const visualTexts = [...document.querySelectorAll(".mobile-menu__visual-text")] as HTMLElement[];
    const firstVisualText = visualTexts[0];
    const closeButton = document.querySelector(".mobile-menu__close") as HTMLElement | null;
    const firstLink = document.querySelector(".mobile-menu__link") as HTMLElement | null;
    const menuRect = menu?.getBoundingClientRect();
    const visualStyle = firstVisualText ? getComputedStyle(firstVisualText) : null;

    return {
      menuRect: menuRect
        ? {
            width: Math.round(menuRect.width),
            height: Math.round(menuRect.height)
          }
        : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      visualTextCount: visualTexts.length,
      firstVisualText: visualStyle
        ? {
            display: visualStyle.display,
            position: visualStyle.position,
            mixBlendMode: visualStyle.mixBlendMode,
            zIndex: Number(visualStyle.zIndex)
          }
        : null,
      menuZIndex: menu ? Number(getComputedStyle(menu).zIndex) : null,
      sourceCloseColor: closeButton ? getComputedStyle(closeButton).color : null,
      sourceLinkColor: firstLink ? getComputedStyle(firstLink).color : null,
      activeClass: document.documentElement.classList.contains("is-mobile-menu-open"),
      visualClass: document.documentElement.classList.contains("has-mobile-menu-visual-text")
    };
  });

  expect(state.activeClass).toBe(true);
  expect(state.visualClass).toBe(true);
  expect(state.menuRect).toEqual(state.viewport);
  expect(state.htmlOverflow).toBe("hidden");
  expect(state.bodyOverflow).toBe("hidden");
  expect(state.visualTextCount).toBe(5);
  expect(state.firstVisualText).toMatchObject({
    display: "block",
    position: "fixed",
    mixBlendMode: "difference"
  });
  expect(state.firstVisualText?.zIndex).toBeGreaterThan(state.menuZIndex ?? 0);
  expect(state.sourceCloseColor).toBe("rgba(0, 0, 0, 0)");
  expect(state.sourceLinkColor).toBe("rgba(0, 0, 0, 0)");

  const beforeWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 650);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(beforeWheel);

  await page.locator(".mobile-menu__close").click();
  await expect(page.locator(".mobile-menu")).toBeHidden();
});
