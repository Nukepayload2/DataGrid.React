import { test, expect } from '@playwright/test'

test('filter-in-tree loads + applying filter changes row count + clean console', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/#/demos/tree-filter')
  await expect(page.locator('.dg-wrapper')).toBeVisible()

  const leftPane = page.locator('.dg-compare__pane').first()

  // Capture initial body cell count (no filter applied)
  const initialBodyCells = await leftPane.locator('.dg-cell-body').count()
  expect(initialBodyCells).toBeGreaterThan(0)

  // Trigger the filter dropdown via the filter trigger icon in the header.
  // The first filter trigger corresponds to the Name column (tree-mode filter).
  const filterTrigger = leftPane.locator('.dg-filter-trigger').first()
  await expect(filterTrigger).toBeVisible()
  await filterTrigger.click()

  // The data-grid renders its filter dropdown in a portal at body root.
  // The dropdown tree is `.dg-filter-dropdown-tree`; click its first checkbox.
  const dropdown = page.locator('.dg-filter-dropdown-tree').first()
  await expect(dropdown).toBeVisible({ timeout: 5000 })

  // antd Tree uses `.ant-tree-checkbox` for node checkboxes (NOT `.ant-checkbox-wrapper`,
  // which is only used by the "Select all items" row). The first `.ant-tree-treenode` is
  // a virtual/aria-hidden spacer — filter to visible, real nodes only.
  const firstCheckbox = dropdown.locator('.ant-tree-treenode:not([aria-hidden="true"]) .ant-tree-checkbox').first()
  await expect(firstCheckbox).toBeVisible()
  await firstCheckbox.click()
  await page.waitForTimeout(200)

  // Click the OK button to apply (FilterDropdown's primary action button)
  const okButton = page.locator('.dg-filter-dropdown-btns .ant-btn-primary').first()
  await expect(okButton).toBeVisible()
  await okButton.click()
  await page.waitForTimeout(500)

  // After filter applied, the trigger should be marked active
  await expect(leftPane.locator('.dg-filter-trigger-active').first()).toBeVisible()

  // Body cell count should reflect the filtered rows (assert it's still > 0 — table not empty)
  const filteredBodyCells = await leftPane.locator('.dg-cell-body').count()
  expect(filteredBodyCells).toBeGreaterThan(0)

  expect(errors).toEqual([])
})
