import { test, expect } from '@playwright/test'

test('basic loads + table visible + clean console', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/#/demos/basic')
  await expect(page.locator('.dg-wrapper')).toBeVisible()

  // Confirm chrome version for the record (driven via executablePath)
  // eslint-disable-next-line no-console
  console.log('browser version:', await page.context().browser()?.version())

  // Header cells visible
  const headerCells = page.locator('.dg-cell-header')
  await expect(headerCells.first()).toBeVisible()
  const headerCount = await headerCells.count()
  expect(headerCount).toBeGreaterThan(0)

  // At least one body cell visible (data-grid rows are made of .dg-cell-body cells)
  const bodyCells = page.locator('.dg-cell-body')
  await expect(bodyCells.first()).toBeVisible()
  const bodyCount = await bodyCells.count()
  expect(bodyCount).toBeGreaterThan(0)

  expect(errors).toEqual([])
})
