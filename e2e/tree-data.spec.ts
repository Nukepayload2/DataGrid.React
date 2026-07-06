import { test, expect } from '@playwright/test'

test('tree-data loads + expand row reveals children + clean console', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/#/demos/tree-data')
  await expect(page.locator('.dg-wrapper')).toBeVisible()

  const leftPane = page.locator('.dg-compare__pane').first()

  // Capture initial body cell count (collapsed: only top-level rows visible)
  const initialBodyCells = await leftPane.locator('.dg-cell-body').count()
  expect(initialBodyCells).toBeGreaterThan(0)

  // Find a collapsed expand icon in the data-grid pane and click to expand
  const expandIcon = leftPane.locator('.dg-expand-icon-collapsed').first()
  await expect(expandIcon).toBeVisible()

  await expandIcon.click()
  // Wait for the children to render
  await page.waitForTimeout(300)

  // After expanding a parent row, more body cells should be visible
  const expandedBodyCells = await leftPane.locator('.dg-cell-body').count()
  expect(expandedBodyCells).toBeGreaterThan(initialBodyCells)

  // The icon should now reflect expanded state
  await expect(leftPane.locator('.dg-expand-icon-expanded').first()).toBeVisible()

  expect(errors).toEqual([])
})
