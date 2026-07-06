import { test, expect } from '@playwright/test'

test('fixed-columns loads + sticky columns on horizontal scroll + clean console', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/#/demos/fixed-columns')
  await expect(page.locator('.dg-wrapper')).toBeVisible()

  // Left pane is the data-grid table
  const leftPane = page.locator('.dg-compare__pane').first()
  const wrapper = leftPane.locator('.dg-wrapper')
  await expect(wrapper).toBeVisible()

  // Header cells visible
  await expect(leftPane.locator('.dg-cell-header').first()).toBeVisible()

  // Find the data-grid horizontal scroll container.
  // The horizontal scroll container is `.dg-scroll.dg-x-scroll` (the inner scroll viewport;
  // `.dg-wrapper` itself has overflow:hidden in this layout mode).
  const scrollContainer = leftPane.locator('.dg-scroll.dg-x-scroll').first()
  await expect(scrollContainer).toBeVisible()

  // Capture initial position of the first fixed-start cell.
  const firstStartCell = leftPane.locator('.dg-cell-fixed-start').first()
  await expect(firstStartCell).toBeVisible()

  const initialRect = await firstStartCell.boundingBox()
  expect(initialRect).not.toBeNull()

  // Scroll horizontally via the inner scroll container
  await scrollContainer.evaluate((el: HTMLElement) => {
    el.scrollLeft = 400
  })
  await page.waitForTimeout(300)

  const scrollLeft = await scrollContainer.evaluate((el: HTMLElement) => el.scrollLeft)
  expect(scrollLeft).toBeGreaterThan(0)

  // After horizontal scroll, the fixed-start cell should remain at the same x
  // (sticky positioning keeps it pinned to the left edge of the viewport)
  const afterRect = await firstStartCell.boundingBox()
  expect(afterRect).not.toBeNull()
  // Allow sub-pixel jitter
  expect(Math.abs((afterRect?.x ?? 0) - (initialRect?.x ?? 0))).toBeLessThan(5)

  expect(errors).toEqual([])
})
