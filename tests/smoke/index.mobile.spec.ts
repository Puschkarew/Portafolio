import { expect, test } from "@playwright/test"

test("Index table mobile shows Year / # / Name and hides desktop-only columns", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 852 })
  await page.goto("http://127.0.0.1:4173/index/", { waitUntil: "networkidle" })

  const table = page.getByRole("region", { name: "Index table" })
  await expect(table).toBeVisible()

  await expect(table.getByText("Name")).toBeVisible()
  await expect(table.getByText("Year")).toBeVisible()
  await expect(table.getByText("#", { exact: true })).toBeVisible()

  const bodyRow = page.locator(".index-table__item:not(.index-table__item--head)").first()
  await expect(bodyRow.locator(".index-table__cell--num")).toBeVisible()
  await expect(bodyRow.getByText("23", { exact: true })).toBeVisible()

  await expect(page.locator(".index-table__item:not(.index-table__item--head) .index-table__cell--agency").first()).toBeHidden()
  await expect(page.locator(".index-table__item:not(.index-table__item--head) .index-table__cell--type").first()).toBeHidden()

  await expect(page.locator(".index-table__grid--head .index-table__cell--viewcase")).toBeHidden()

  const myboxRow = page.locator(".index-table__item").filter({ hasText: "Mybox" }).first()
  const myboxLink = myboxRow.getByRole("link", { name: "View case: Mybox" })
  await expect(myboxLink).toBeVisible()
  await expect(myboxLink).toHaveClass(/index-table__line--linked/)

  const listStyle = await page.locator(".index-table__list").evaluate((el) => getComputedStyle(el).listStyleType)
  expect(listStyle).toBe("none")
})
