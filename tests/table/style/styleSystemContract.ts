// ── `@types/node` 缺失的三处抑制（本仓既定写法，非本批首创）──────────────────────
// 本仓刻意不装 `@types/node`：`tsconfig.lib.json` 的 `types` 只有 `vite/client`（`src/vite-env.d.ts`
// 同款），理由见 `src/table/devWarn.ts:51`。故 `node:fs` / `node:path` / `process` 运行期存在、类型面缺声明。
//
// ⚠️ 已实测排除的替代方案（**别再试**）：改用 Vite 的 `?raw` 导入
// （`import css from '…/table.css?raw'`，ledger 里 BAT-11 的计划写的是这条路）——
// 在本仓 vitest 环境下**读回来是空串**：`?raw` 对 `.md` / `.json` 正常（实测 3419 / 3330 字节），
// 对 `.css` 一律 0 字节，且**与是否挂 `viteSingleFile()` 插件无关**（去掉全部插件复测同读数 0）。
// 根因：Vite 的 CSS 管线在 test/SSR 变换下先于 raw 插件吃掉 `.css` 请求并返回空串。
// ⇒ 本件保留 `node:fs` 读盘（运行期行为与本批之前逐字相同），只把类型面的缺口显式标注出来。
//
// 抑制是**自校验**的：日后一旦装上 `@types/node`，这三行会因「抑制未被使用」而红（TS2578），是提醒而非隐患。
// @ts-expect-error TS2591：本仓无 @types/node，'node:fs' 无类型声明（运行时可用）
import { readFileSync } from 'node:fs'
// @ts-expect-error TS2591：本仓无 @types/node，'node:path' 无类型声明（运行时可用）
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// @ts-expect-error TS2591：本仓无 @types/node，'process' 无类型声明（运行时可用）
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
      '--dg-sticky-scroll-left',
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
