import { expect, test } from "@playwright/test"

test("Index table collapses to Name/Year on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 852 })
  await page.goto("http://127.0.0.1:4173/index/", { waitUntil: "networkidle" })

  const table = page.getByRole("region", { name: "Index table" })
  await expect(table).toBeVisible()

  // Header should only show Name/Year in the mobile layout.
  await expect(table.getByText("Name")).toBeVisible()
  await expect(table.getByText("Year")).toBeVisible()

  // Desktop-only columns must be hidden.
  await expect(page.locator(".index-table__cell--num").first()).toBeHidden()
  await expect(page.locator(".index-table__cell--agency").first()).toBeHidden()
  await expect(page.locator(".index-table__cell--type").first()).toBeHidden()
  await expect(page.locator(".index-table__cell--viewcase").first()).toBeHidden()

  // UL must not render list markers.
  const listStyle = await page.locator(".index-table__list").evaluate((el) => getComputedStyle(el).listStyleType)
  expect(listStyle).toBe("none")
})

