import { test, expect } from "@playwright/test"

/** Desktop blocks.svg scene (see assets/mezhdu-prochim-letters bundle `v4`). */
const DESIGN_VIEWBOX = { minX: 0, minY: 0, width: 3082, height: 1996 }

function fitViewportToDesign(
  viewW: number,
  viewH: number,
  design: typeof DESIGN_VIEWBOX
): { minX: number; minY: number; width: number; height: number } {
  function x2(e: number, t: number, n: typeof DESIGN_VIEWBOX) {
    if (e <= 0 || t <= 0 || n.width <= 0 || n.height <= 0) {
      return { width: 0, height: 0, left: 0, top: 0 }
    }
    const i = Math.min(e / n.width, t / n.height)
    const o = n.width * i
    const r = n.height * i
    return { width: o, height: r, left: (e - o) / 2, top: t - r }
  }
  function l4(
    e: number,
    t: number,
    n: { width: number; height: number; left: number; top: number },
    i: typeof DESIGN_VIEWBOX
  ) {
    if (e <= 0 || t <= 0 || n.width <= 0 || n.height <= 0) return i
    const o = -n.left
    const r = -n.top
    const l = e - n.left
    const s = t - n.top
    return {
      minX: i.minX + (o / n.width) * i.width,
      minY: i.minY + (r / n.height) * i.height,
      width: ((l - o) / n.width) * i.width,
      height: ((s - r) / n.height) * i.height
    }
  }
  const d = x2(viewW, viewH, design)
  return l4(viewW, viewH, d, design)
}

function parseViewBox(raw: string | null): {
  minX: number
  minY: number
  width: number
  height: number
} | null {
  if (!raw) return null
  const parts = raw.trim().split(/\s+/).map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null
  return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] }
}

const WIDE_VIEWPORTS = [
  { width: 1920, height: 1080, name: "1920x1080" },
  { width: 2560, height: 1440, name: "2560x1440" },
  { width: 3440, height: 1440, name: "3440x1440-ultrawide" }
] as const

for (const vp of WIDE_VIEWPORTS) {
  test.describe(`Mezhdu letters iframe @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } })

    test("iframe fills hero media; scene viewBox matches uniform fit center/bottom", async ({ page }) => {
      await page.goto("/mezhdu-prochim/", { waitUntil: "domcontentloaded" })

      const iframe = page.locator("iframe.case-hero__physics-frame")
      await expect(iframe).toBeVisible({ timeout: 15_000 })

      const media = page.locator(".case-hero__media")
      const mediaBox = await media.boundingBox()
      const iframeBox = await iframe.boundingBox()
      expect(mediaBox).not.toBeNull()
      expect(iframeBox).not.toBeNull()
      expect(iframeBox!.width).toBeGreaterThan(400)
      // Chromium: ~0px drift; Firefox can differ by tens of px (subpixel / layout).
      expect(Math.abs(iframeBox!.width - mediaBox!.width) / mediaBox!.width).toBeLessThan(0.03)

      const frame = page.frameLocator("iframe.case-hero__physics-frame")
      await frame.locator(".scene-stage").waitFor({ state: "visible", timeout: 15_000 })

      const inner = await frame.locator("body").evaluate(() => {
        const stage = document.querySelector(".scene-stage")
        const host = document.querySelector(".stage-host")
        const plate = document.querySelector(".stage-plate")
        const vb = stage?.getAttribute("viewBox") ?? null
        return {
          viewBox: vb,
          hostW: host?.clientWidth ?? 0,
          hostH: host?.clientHeight ?? 0,
          plateW: plate instanceof HTMLElement ? plate.offsetWidth : 0,
          plateH: plate instanceof HTMLElement ? plate.offsetHeight : 0
        }
      })

      expect(inner.hostW).toBeGreaterThan(0)
      expect(inner.hostH).toBeGreaterThan(0)
      expect(inner.plateW).toBe(inner.hostW)
      expect(inner.plateH).toBe(inner.hostH)

      const parsed = parseViewBox(inner.viewBox)
      expect(parsed).not.toBeNull()

      const expected = fitViewportToDesign(inner.hostW, inner.hostH, DESIGN_VIEWBOX)
      const tol = 0.5
      expect(parsed!.minX).toBeCloseTo(expected.minX, 1)
      expect(parsed!.minY).toBeCloseTo(expected.minY, 1)
      expect(parsed!.width).toBeCloseTo(expected.width, tol)
      expect(parsed!.height).toBeCloseTo(expected.height, tol)
    })
  })
}
