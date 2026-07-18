import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('style system contract', () => {
  it('keeps --dg-* variables limited to data-grid-specific mechanics', () => {
    const tokens = read('src/table/style/tokens.css')
    const table = read('src/table/style/table.css')
    const source = `${tokens}\n${table}`
    const dgVars = Array.from(source.matchAll(/--dg-[a-z0-9-]+/g), (match) => match[0])
    const unique = [...new Set(dgVars)].sort()

    expect(unique).toEqual([
      '--dg-row-max-h',
      '--dg-row-min-h',
      '--dg-scrollbar-thumb-active-bg',
      '--dg-scrollbar-thumb-expanded-opacity',
    ])
  })

  it('uses antd CSS variables for overlapping Table styling concepts', () => {
    const table = read('src/table/style/table.css')

    expect(table).toContain('font-size: var(--ant-table-cell-font-size)')
    expect(table).toContain('background: var(--ant-color-bg-container)')
    expect(table).toContain('background: var(--ant-table-header-bg)')
    expect(table).toContain('padding: var(--ant-table-cell-padding-block) var(--ant-table-cell-padding-inline)')
    expect(table).toContain('border-radius: var(--ant-table-header-border-radius)')
    expect(table).toContain('background: var(--ant-table-row-hover-bg)')
    expect(table).toContain('background: var(--ant-table-body-sort-bg)')
    expect(table).toContain('color: var(--ant-table-header-icon-color)')
  })

  it('does not override inline antd Table vars from size classes', () => {
    const tokens = read('src/table/style/tokens.css')
    const table = read('src/table/style/table.css')

    expect(tokens).not.toMatch(/\.dg-wrapper\.dg-size-(middle|small)\s*\{[^}]*--ant-table-cell-/s)
    expect(table).toContain('font-size: var(--ant-table-cell-font-size-md)')
    expect(table).toContain('font-size: var(--ant-table-cell-font-size-sm)')
    expect(table).toContain('padding: var(--ant-table-cell-padding-block-md) var(--ant-table-cell-padding-inline-md)')
    expect(table).toContain('padding: var(--ant-table-cell-padding-block-sm) var(--ant-table-cell-padding-inline-sm)')
  })
})
