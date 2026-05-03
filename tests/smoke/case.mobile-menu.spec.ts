import path from "node:path"
import { test, expect } from "@playwright/test"
import { runtimeHomePath, runtimeHomeUrl } from "./runtime-home"

const runtimeMyboxUrl = process.env.RUNTIME_HOME_PATH
  ? `file://${path.join(path.dirname(runtimeHomePath), "mybox", "index.html")}`
  : new URL("mybox/", runtimeHomeUrl.replace(/\/?$/, "/")).href

test("case page (Mybox) mobile menu opens from last header hit link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 852 })
  await page.goto(runtimeMyboxUrl, { waitUntil: "networkidle" })
  await expect(page.locator(".site-header__hit-link").first()).toBeAttached({ timeout: 15_000 })

  await page.locator(".site-header__hit-link").last().click({ force: true })
  await expect(page.locator(".mobile-menu")).toBeVisible()

  const open = await page.evaluate(() =>
    document.documentElement.classList.contains("is-mobile-menu-open")
  )
  expect(open).toBe(true)
})
