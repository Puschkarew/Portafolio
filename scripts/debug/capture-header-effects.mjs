import { chromium } from "@playwright/test"

const BASE_URL = process.env.URL ?? "http://127.0.0.1:4173/"

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1512, height: 900 }, deviceScaleFactor: 2 })

  await page.goto(BASE_URL, { waitUntil: "networkidle" })
  await page.waitForTimeout(250)

  await page.screenshot({ path: "artifacts/debug/header/top-default.png" })

  // Toggle header tint (debug helper) and capture.
  await page.keyboard.press("h")
  await page.waitForTimeout(250)
  await page.screenshot({ path: "artifacts/debug/header/top-h-tint.png" })

  // Small scroll so header overlaps hero text (more contrast for blur/blend).
  await page.mouse.wheel(0, 180)
  await page.waitForTimeout(250)
  await page.screenshot({ path: "artifacts/debug/header/scroll-180-h-tint.png" })

  // Scroll to a section where the backdrop is visually non-uniform.
  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(250)
  await page.screenshot({ path: "artifacts/debug/header/scroll-h-tint.png" })

  // Toggle tint off and capture at same scroll.
  await page.keyboard.press("h")
  await page.waitForTimeout(250)
  await page.screenshot({ path: "artifacts/debug/header/scroll-default.png" })

  // Toggle blend override for tags (should not affect header, but we capture for completeness).
  await page.keyboard.press("b")
  await page.waitForTimeout(250)
  await page.screenshot({ path: "artifacts/debug/header/scroll-b-no-blend.png" })

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
