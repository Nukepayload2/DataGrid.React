import { test, expect } from '@playwright/test'

test('virtual-list loads + scroll + clean console', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/#/demos/virtual-list')
  await expect(page.locator('.dg-wrapper')).toBeVisible()

  // virtual-list.dg.tsx has virtual=true hardcoded with 10000 rows.
  // Scroll the virtual scroll container and confirm rows remain visible.
  const scrollContainer = page.locator('.dg-scroll.dg-virtual-scroll').first()
  await expect(scrollContainer).toBeVisible()

  // Capture initial body cell count
  const initialCount = await page.locator('.dg-cell-body').count()

  // Scroll down within the virtual scroll container
  await scrollContainer.evaluate((el: HTMLElement) => {
    el.scrollTop = 800
  })
  // Wait for scroll to settle and virtual window to update
  await page.waitForTimeout(300)

  const scrollTop = await scrollContainer.evaluate((el: HTMLElement) => el.scrollTop)
  expect(scrollTop).toBeGreaterThan(0)

  // After scrolling, body cells should still be visible (virtualization renders the new window)
  await expect(page.locator('.dg-cell-body').first()).toBeVisible()
  const afterScrollCount = await page.locator('.dg-cell-body').count()
  expect(afterScrollCount).toBeGreaterThan(0)

  // Sanity: after scrolling to ~800px we should still have a healthy number of cells
  // (not necessarily equal — virtual window renders viewport-sized slice)
  expect(initialCount).toBeGreaterThan(0)

  expect(errors).toEqual([])
})
