import { expect, test } from "@playwright/test"

test("Index table mobile shows Name and Year on one row (Figma mobile Index line)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 852 })
  await page.goto("/index/index.html", { waitUntil: "networkidle" })

  const table = page.locator("section.index-table")
  await expect(table).toBeVisible()

  await expect(table.getByText("Name")).toBeVisible()
  await expect(table.getByText("Year")).toBeVisible()
  await expect(table.getByText("#", { exact: true })).toBeHidden()

  const bodyRows = page.locator(".index-table__item:not(.index-table__item--head)")
  const firstRow = bodyRows.first()
  await expect(firstRow.getByText("Untitled Typeface")).toBeVisible()
  await expect(firstRow.getByText("2026", { exact: true })).toBeVisible()
  await expect(firstRow.locator(".index-table__cell--num")).toBeHidden()

  const secondRow = bodyRows.nth(1)
  await expect(secondRow.getByText("Made by Mad Site")).toBeVisible()
  await expect(secondRow.getByText("2026", { exact: true })).toBeVisible()

  await expect(page.locator(".index-table__item:not(.index-table__item--head) .index-table__cell--agency").first()).toBeHidden()
  await expect(page.locator(".index-table__item:not(.index-table__item--head) .index-table__cell--type").first()).toBeHidden()
  await expect(page.locator(".index-table__item:not(.index-table__item--head) .index-table__cell--viewcase").first()).toBeHidden()

  const myboxRow = page.locator(".index-table__item").filter({ hasText: "MYBOX" }).first()
  const myboxLink = myboxRow.getByRole("link", { name: "MYBOX, 2025" })
  await expect(myboxLink).toBeVisible()
  await expect(myboxLink).toHaveClass(/index-table__line--linked/)

  const listStyle = await page.locator(".index-table__list").evaluate((el) => getComputedStyle(el).listStyleType)
  expect(listStyle).toBe("none")
})
