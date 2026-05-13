import path from "node:path"
import { test, expect } from "@playwright/test"
import { runtimeHomePath, runtimeHomeUrl } from "./runtime-home"

const runtimeMyboxUrl = process.env.RUNTIME_HOME_PATH
  ? `file://${path.join(path.dirname(runtimeHomePath), "mybox", "index.html")}`
  : new URL("mybox/", runtimeHomeUrl.replace(/\/?$/, "/")).href

test("case page (MYBOX) mobile menu opens from last header hit link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 852 })
  await page.goto(runtimeMyboxUrl, { waitUntil: "networkidle" })
  const mobileHitLink = page.locator('.site-header__hit-link[data-header-hit-source="mobile-trigger"]')
  await expect(mobileHitLink).toBeAttached({ timeout: 15_000 })

  await mobileHitLink.click({ force: true })
  await expect(page.locator(".mobile-menu")).toBeVisible()

  const state = await page.evaluate(() => ({
    open: document.documentElement.classList.contains("is-mobile-menu-open"),
    mobileHitLinkCount: document.querySelectorAll('.site-header__hit-link[data-header-hit-source="mobile-trigger"]').length
  }))
  expect(state.open).toBe(true)
  expect(state.mobileHitLinkCount).toBe(1)
})
