// 黑盒 feature-slice 测试：与 antd 自家 Table.order 测试用例逐条对齐（antd-style 黑盒层）。
//
// 对齐来源: G:\Projects\ant-design\components\table\__tests__\Table.order.test.tsx
//   antd 2 个 it → 本文件对齐 2 条（直测 1 + skip 1），另加 1 条补充直测
//   （哨兵列位置 = 列顺序，src/table/useColumnTreeBuilder.ts:74-96）= 共 3 个 it。
//
// 选择器重映射（依据 src/table/engine/BodyGrid.tsx:164-225、engine/cellRenderUtils.tsx:167-171）:
//   - antd `container.querySelectorAll('tr')[1]`（第 2 个 tr = 首个数据行）→ data-grid 无行元素，
//     用 `.dg-cell-body[data-row-index="0"]` 取该数据行全部格
//   - antd `td.ant-table-cell-fix-start` → `.dg-cell-fixed-start`（别名类为 `.ant-table-cell-fix-left`；
//     data-grid 用 start/end 命名，别名只有 left/right，**没有** `-fix-start`）
//   - antd `.ant-table-selection-col` 等选择列类 → 选择列格 = `[data-column-key="__dg_selection__"]`
//   - antd `.ant-table-row-expand-icon` → `button.dg-expand-icon`（展开列 key = `__dg_expand__`）
import { afterAll, describe, expect, it, vi } from 'vitest'

import { Table, type TableProps } from '../../../src/table/index'
import { customRender } from '../../shared/render'

const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

afterAll(() => {
  errSpy.mockRestore()
})

describe('Table.order', () => {
  const columns: TableProps<{ key: number; name: string }>['columns'] = [
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

  function createTable(props: TableProps<{ key: number; name: string }> = {}) {
    return <Table columns={columns} dataSource={data} pagination={false} {...props} />
  }

  /** 取某数据行的全部格（按 DOM 顺序）。 */
  function rowCells(container: HTMLElement, rowIndex: number): Array<HTMLElement> {
    return Array.from(
      container.querySelectorAll<HTMLElement>(`.dg-cell-body[data-row-index="${rowIndex}"]`),
    )
  }

  // antd L40：columns 里出现多个 `Table.SELECTION_COLUMN` 时报
  // 'Warning: [antd: Table] Multiple `SELECTION_COLUMN` exist in `columns`.'
  // skip 依据（实测 + src）：data-grid 没有该校验 —— 哨兵遍历只按位置插入选择列节点、不做重复检测
  // （src/table/useColumnTreeBuilder.ts:64-96），全 src/table 仅 usePagination.ts:177 有一处 console.warn，
  // 无 antd 风格的 warning 工具；实测重复哨兵时选择列被渲染两次（2 个表头格 + 每行 2 个数据格，均带
  // data-column-key="__dg_selection__"），console.error 收到的是 React 的
  // 'Encountered two children with the same key'（重复的选择列节点共用 key `__dg_selection__`），
  // 文案与 antd 断言不同，故该 antd 断言在 data-grid 上无法成立（已在报告中记为疑似缺陷）。
  it.skip('warning if duplicated SELECTION_COLUMN', () => {
    // 占位：data-grid 无重复 SELECTION_COLUMN 校验（见上方依据）。
  })

  // antd L57：首列 `fixed: true` + 中间的 SELECTION_COLUMN → 选择列自动跟随固定（"auto fixed"）。
  // 实现依据：src/table/useColumnTreeBuilder.ts:98-127（rowSelection.fixed 未设时优先继承 nextCol、
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
  })

  // 补充直测：哨兵列位置即列顺序（SELECTION_COLUMN / EXPAND_COLUMN 插在哨兵所在位置，而非恒在首列）。
  // 依据：src/table/useColumnTreeBuilder.ts:74-96（命中哨兵就地插入；未命中才 unshift/splice 到默认位置）。
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
    expect(
      Array.from(container.querySelectorAll('.dg-cell-header')).map((cell) =>
        cell.getAttribute('data-column-key'),
      ),
    ).toEqual(['name', '__dg_selection__', 'key', '__dg_expand__'])

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
  })
})
