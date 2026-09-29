// 黑盒 feature-slice 测试：与 antd 自家 Table.order 测试用例逐条对齐（antd-style 黑盒层）。
//
// 对齐来源: {{AntDesign}}/components/table/__tests__/Table.order.test.tsx
//   antd 2 个 it → 本文件对齐 2 条（直测 2 + skip 0），另加 3 条补充直测
//   （哨兵列位置 = 列顺序 src/table/useColumnTreeBuilder.ts:75-134；重复 EXPAND_COLUMN 查重
//   :97-108；EXPAND_COLUMN 无 expandable 告警 :115-127）= 共 5 个 it。
//
// 选择器重映射（依据 src/table/engine/BodyGrid.tsx:164-225、engine/cellRenderUtils.tsx:167-171):
//   - antd `container.querySelectorAll('tr')[1]`（第 2 个 tr = 首个数据行）→ data-grid 无行元素，
//     用 `.dg-cell-body[data-row-index="0"]` 取该数据行全部格
//   - antd `td.ant-table-cell-fix-start` → `.dg-cell-fixed-start`（别名类为 `.ant-table-cell-fix-left`；
//     data-grid 用 start/end 命名，别名只有 left/right，**没有** `-fix-start`）
//   - antd `.ant-table-selection-col` 等选择列类 → 选择列格 = `[data-column-key="__dg_selection__"]`
//   - antd `.ant-table-row-expand-icon` → `button.dg-expand-icon`（展开列 key = `__dg_expand__`）
//
// 告警通道分叉（供 BAT-13 登记）：antd 的 `warning` 直接写 `console.error('Warning: …')`
//   （`@rc-component/util/es/warning.js` 的 `warning`），data-grid 沿用本仓先例
//   `src/table/engine/usePagination.ts:175-180` —— src 不引 antd/@rc-component 的 warning 依赖，
//   改发 `console.warn('[data-grid] …')`。故本文件对告警的断言落在 warnSpy 上。
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import { Table, type TableProps } from '../../../src/table/index'
import { customRender } from '../../shared/render'

const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

afterEach(() => {
  // 逐用例清空调用记录：告警断言只看本轮挂载内的调用（StrictMode 双渲染 + 勾选/列树重建会让
  // **同一条**文案重复出现，故按去重后的文案「种类」计数，见各用例注释）。
  errSpy.mockClear()
  warnSpy.mockClear()
})

afterAll(() => {
  errSpy.mockRestore()
  warnSpy.mockRestore()
})

type Rec = { key: number; name: string }

/** warnSpy 本轮收到的消息文本。 */
function warnTexts(): Array<string> {
  return warnSpy.mock.calls.map((args) => args.join(' '))
}

/** 去重后的告警文案种类（同一条文案被 StrictMode 双渲染重复触发 → 仍算 1 条）。 */
function distinctWarnTexts(): Array<string> {
  return [...new Set(warnTexts())]
}

/** React duplicate-key 报错条数（哨兵查重后必须为 0）。 */
function duplicateKeyErrorCount(): number {
  return errSpy.mock.calls.filter((args) => args.join(' ').includes('same key')).length
}

describe('Table.order', () => {
  const columns: TableProps<Rec>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
    },
  ]

  const data = [
    { key: 0, name: 'Jack' },
    { key: 1, name: 'Lucy' },
    { key: 2, name: 'Tom' },
    { key: 3, name: 'Jerry' },
  ]

  function createTable(props: TableProps<Rec> = {}) {
    return <Table columns={columns} dataSource={data} pagination={false} {...props} />
  }

  /** 取某数据行的全部格（按 DOM 顺序）。 */
  function rowCells(container: HTMLElement, rowIndex: number): Array<HTMLElement> {
    return Array.from(
      container.querySelectorAll<HTMLElement>(`.dg-cell-body[data-row-index="${rowIndex}"]`),
    )
  }

  /** 取表头格的 data-column-key（按 DOM 顺序）。 */
  function headerKeysOf(container: HTMLElement): Array<string | null> {
    return Array.from(container.querySelectorAll<HTMLElement>('.dg-cell-header')).map((cell) =>
      cell.getAttribute('data-column-key'),
    )
  }

  // antd L40：columns 里出现多个 `Table.SELECTION_COLUMN` 时报
  // 'Warning: [antd: Table] Multiple `SELECTION_COLUMN` exist in `columns`.'（antd 侧走 console.error，
  // 且 `useSelection.js:495-496` 只保留 `indexOf` 首个哨兵）。
  // 修复依据（BAT-9 #15）：src/table/useColumnTreeBuilder.ts:76-94 —— 命中重复 SELECTION_COLUMN 时
  //   只保留首个、跳过其余并发 `[data-grid]` console.warn（此前无查重：同一 selectionNode 引用被推两次，
  //   选择列 key 恒为 SELECTION_COLUMN_KEY ⇒ 同层兄弟重复 React key ⇒ 渲染两套选择列 + duplicate-key 报错）。
  it('warning if duplicated SELECTION_COLUMN', () => {
    const { container } = customRender(
      createTable({
        columns: [
          Table.SELECTION_COLUMN,
          { title: 'Name', dataIndex: 'name' },
          Table.SELECTION_COLUMN,
          { title: 'Key', dataIndex: 'key' },
        ],
        rowSelection: {},
      }),
    )

    // 只渲染 **1** 套选择列（表头 1 格 + 数据行 1 格），且落在**首个**哨兵位置（第 1 列）。
    expect(headerKeysOf(container)).toEqual(['__dg_selection__', 'name', 'key'])
    expect(rowCells(container, 0).map((cell) => cell.getAttribute('data-column-key'))).toEqual([
      '__dg_selection__',
      'name',
      'key',
    ])

    // 1 条告警（去重后仅这一种文案）且文案点名 SELECTION_COLUMN。
    expect(distinctWarnTexts()).toEqual([expect.stringContaining('SELECTION_COLUMN')])
    expect(warnTexts().length).toBeGreaterThan(0)

    // 查重后不再有同层兄弟重复 key ⇒ React duplicate-key 报错为 0（修复前实测 15 条）。
    expect(duplicateKeyErrorCount()).toBe(0)
  })

  // antd L57：首列 `fixed: true` + 中间的 SELECTION_COLUMN → 选择列自动跟随固定（"auto fixed"）。
  // 实现依据：src/table/useColumnTreeBuilder.ts:136-165（rowSelection.fixed 未设时优先继承 nextCol、
  // 其次 prevCol）。断言重映射：tr/td → `.dg-cell-body[data-row-index="0"]`；
  // `.ant-table-cell-fix-start` → `.dg-cell-fixed-start`。
  it('auto fixed', () => {
    const { container } = customRender(
      createTable({
        columns: [
          {
            dataIndex: 'name',
            fixed: true,
          },
          Table.SELECTION_COLUMN,
          {
            dataIndex: 'key',
          },
        ],
        rowSelection: {},
      }),
    )

    const cells = rowCells(container, 0)
    expect(cells).toHaveLength(3)
    // 列顺序 = columns 数组顺序（name → 选择列哨兵位置 → key）。
    expect(cells.map((cell) => cell.getAttribute('data-column-key'))).toEqual([
      'name',
      '__dg_selection__',
      'key',
    ])

    const fixedCells = cells.filter((cell) => cell.classList.contains('dg-cell-fixed-start'))
    expect(fixedCells).toHaveLength(2)
    expect(fixedCells.map((cell) => cell.getAttribute('data-column-key'))).toEqual([
      'name',
      '__dg_selection__',
    ])
    // 未固定的尾列不带头部固定类。
    expect(cells[2].classList.contains('dg-cell-fixed-start')).toBe(false)
    expect(cells[2].classList.contains('ant-table-cell-fix-left')).toBe(false)

    // 合法用法（单哨兵）对照组：**零告警**——本批只加告警，不许把正常姿势也误报。
    expect(warnTexts()).toEqual([])
  })

  // 补充直测：哨兵列位置即列顺序（SELECTION_COLUMN / EXPAND_COLUMN 插在哨兵所在位置，而非恒在首列）。
  // 依据：src/table/useColumnTreeBuilder.ts:75-134（命中哨兵就地插入；未命中才 unshift/splice 到默认位置）。
  it('places sentinel columns at their declared position', () => {
    const { container } = customRender(
      <Table
        columns={[
          { title: 'Name', dataIndex: 'name' },
          Table.SELECTION_COLUMN,
          { title: 'Key', dataIndex: 'key' },
          Table.EXPAND_COLUMN,
        ]}
        dataSource={data}
        pagination={false}
        rowSelection={{}}
        expandable={{ expandedRowRender: () => null }}
      />,
    )

    // 表头顺序 = 声明顺序（name → 选择列 → key → 展开列）。
    expect(headerKeysOf(container)).toEqual([
      'name',
      '__dg_selection__',
      'key',
      '__dg_expand__',
    ])

    // 数据行同序；展开图标落在展开列格内。
    const cells = rowCells(container, 0)
    expect(cells.map((cell) => cell.getAttribute('data-column-key'))).toEqual([
      'name',
      '__dg_selection__',
      'key',
      '__dg_expand__',
    ])
    const expandCell = cells[3]
    expect(expandCell.querySelectorAll('button.dg-expand-icon')).toHaveLength(1)

    // 合法用法（两类哨兵各一个）对照组：**零告警**。
    expect(warnTexts()).toEqual([])
    expect(duplicateKeyErrorCount()).toBe(0)
  })

  // 补充直测（BAT-9 附带条）：`columns` 出现 EXPAND_COLUMN 但未配置 expandable → 告警。
  // 参照：rc-table `@rc-component/table/es/hooks/useColumns/index.js:163-165`
  //   '`expandable` is not config but there exist `EXPAND_COLUMN` in `columns`.'
  // 修复依据：src/table/useColumnTreeBuilder.ts:115-127（此前 expandNode 为空时静默丢弃哨兵、零提示）。
  it('warns when EXPAND_COLUMN exists but expandable is not configured', () => {
    const { container } = customRender(
      createTable({
        columns: [
          { title: 'Name', dataIndex: 'name' },
          Table.EXPAND_COLUMN,
          { title: 'Key', dataIndex: 'key' },
        ],
      }),
    )

    // 哨兵被丢弃（无展开列），普通列顺序不受影响。
    expect(headerKeysOf(container)).toEqual(['name', 'key'])

    // 1 条告警（去重后仅这一种文案）且文案点名 EXPAND_COLUMN。
    expect(distinctWarnTexts()).toEqual([expect.stringContaining('EXPAND_COLUMN')])
    expect(warnTexts().length).toBeGreaterThan(0)
    expect(duplicateKeyErrorCount()).toBe(0)
  })

  // 补充直测（BAT-9 #15 同型第二面）：重复 EXPAND_COLUMN → 只渲染 1 套展开列 + 1 条告警。
  // 修复依据：src/table/useColumnTreeBuilder.ts:97-108。
  it('deduplicates repeated EXPAND_COLUMN sentinels', () => {
    const { container } = customRender(
      createTable({
        columns: [
          Table.EXPAND_COLUMN,
          { title: 'Name', dataIndex: 'name' },
          Table.EXPAND_COLUMN,
        ],
        expandable: { expandedRowRender: () => null },
      }),
    )

    // 只渲染 1 套展开列（首个哨兵位置）。
    expect(headerKeysOf(container)).toEqual(['__dg_expand__', 'name'])
    expect(rowCells(container, 0).map((cell) => cell.getAttribute('data-column-key'))).toEqual([
      '__dg_expand__',
      'name',
    ])

    expect(distinctWarnTexts()).toEqual([expect.stringContaining('EXPAND_COLUMN')])
    expect(warnTexts().length).toBeGreaterThan(0)
    expect(duplicateKeyErrorCount()).toBe(0)
  })
})
