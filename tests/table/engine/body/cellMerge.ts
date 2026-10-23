import { describe, expect, it, vi } from 'vitest'
import { computeCellMergePlan, hasCellMergeDeclaration } from '../../../../src/table/engine/cellMerge'
import type { EngineLeafColumn } from '../../../../src/table/engine/types'

function columns<RecordType>(
  onCells: Array<EngineLeafColumn<RecordType>['onCell'] | undefined>,
): Array<EngineLeafColumn<RecordType>> {
  return onCells.map((onCell, index) => ({ key: String(index), onCell }))
}

describe('computeCellMergePlan', () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }]

  it('skips empty inputs and columns without onCell', () => {
    expect(computeCellMergePlan([], rows)).toBeNull()
    expect(computeCellMergePlan(columns([undefined]), [])).toBeNull()
    expect(computeCellMergePlan(columns([undefined]), rows)).toBeNull()
  })

  it('defaults null and thrown onCell results to 1x1 cells', () => {
    const plan = computeCellMergePlan(
      columns([
        () => null as any,
        () => {
          throw new Error('boom')
        },
      ]),
      rows.slice(0, 1),
    )

    expect(plan).toEqual([
      [{ hidden: false, colSpan: 1, rowSpan: 1 }],
      [{ hidden: false, colSpan: 1, rowSpan: 1 }],
    ])
  })

  it('hides cells with zero or negative spans and treats NaN as default', () => {
    const plan = computeCellMergePlan(
      columns([
        () => ({ colSpan: 0 }),
        () => ({ rowSpan: -1 }),
        () => ({ colSpan: Number.NaN, rowSpan: Number.NaN }),
      ]),
      rows.slice(0, 1),
    )!

    expect(plan[0][0]).toEqual({ hidden: true, colSpan: 1, rowSpan: 1 })
    expect(plan[1][0]).toEqual({ hidden: true, colSpan: 1, rowSpan: 1 })
    expect(plan[2][0]).toEqual({ hidden: false, colSpan: 1, rowSpan: 1 })
  })

  it('covers rectangular merge regions and clips spans at table bounds', () => {
    const plan = computeCellMergePlan(
      columns([
        (_record, rowIndex) => (rowIndex === 0 ? { colSpan: 2, rowSpan: 2 } : undefined),
        undefined,
        (_record, rowIndex) => (rowIndex === 2 ? { colSpan: 5, rowSpan: 5 } : undefined),
      ]),
      rows,
    )!

    expect(plan[0][0]).toEqual({ hidden: false, colSpan: 2, rowSpan: 2 })
    expect(plan[1][0].hidden).toBe(true)
    expect(plan[0][1].hidden).toBe(true)
    expect(plan[1][1].hidden).toBe(true)
    expect(plan[2][2]).toEqual({ hidden: false, colSpan: 1, rowSpan: 1 })
  })

  it('does not propagate spans declared by covered cells', () => {
    const plan = computeCellMergePlan(
      columns([
        () => ({ colSpan: 2 }),
        () => ({ colSpan: 2 }),
        () => undefined,
      ]),
      rows.slice(0, 1),
    )!

    expect(plan[0][0]).toEqual({ hidden: false, colSpan: 2, rowSpan: 1 })
    expect(plan[1][0].hidden).toBe(true)
    expect(plan[2][0].hidden).toBe(false)
  })

  it('ignores obsolete span props returned from render results', () => {
    const render = vi.fn((value, _record, index) => index === 0
      ? { children: value, props: { colSpan: 2, rowSpan: 2 } }
      : value)
    const renderColumns: Array<EngineLeafColumn<{ id: number }>> = [
      {
        key: 'name',
        dataIndex: 'id',
        render,
      },
      { key: 'age', dataIndex: 'id' },
    ]

    expect(hasCellMergeDeclaration(renderColumns, rows)).toBe(false)
    expect(computeCellMergePlan(renderColumns, rows)).toBeNull()
    expect(render).not.toHaveBeenCalled()
  })

  it('uses onCell instead of span props returned from render', () => {
    const renderColumns: Array<EngineLeafColumn<{ id: number }>> = [
      {
        key: 'name',
        dataIndex: 'id',
        render: (value) => ({ children: value, props: { colSpan: 2 } }),
        onCell: () => ({ colSpan: 1 }),
      },
      { key: 'age', dataIndex: 'id' },
    ]
    const plan = computeCellMergePlan(renderColumns, rows.slice(0, 1))!

    expect(plan[0][0]).toEqual({ hidden: false, colSpan: 1, rowSpan: 1 })
    expect(plan[1][0].hidden).toBe(false)
  })

  // 树形数据：rowSpan 数"行"，已展开的子行是附加轨道，不占配额。
  //   否则子行会吃掉配额，合并格停在子行末尾、同组剩余行整列留空。
  describe('tree rows (rowLevels)', () => {
    // 华东组三行（张三 + 它的两个子行 + 李四 + 王五）→ 7 条扁平行：
    //   [0] 张三(level 0) [1] 任务A(1) [2] 任务B(1) [3] 李四(0) [4] 王五(0) [5] 赵六(0) [6] 钱七(0)
    const levels = [0, 1, 1, 0, 0, 0, 0]
    const treeRows = levels.map((_, index) => ({ id: index }))
    const groupColumn = (rowSpans: Array<number | undefined>) =>
      columns([(_record, rowIndex) => {
        const rowSpan = rowSpans[rowIndex]
        return rowSpan === undefined ? undefined : { rowSpan }
      }])

    it('counts rowSpan in rows and folds expanded children into the covered tracks', () => {
      const plan = computeCellMergePlan(
        groupColumn([3, undefined, undefined, 0, 0, 2, 0]),
        treeRows,
        levels,
      )!

      // 华东组：声明 3 行（张三/李四/王五）→ 轨道 0..4（含 2 条子行轨道）。
      expect(plan[0][0]).toEqual({ hidden: false, colSpan: 1, rowSpan: 5 })
      // 子行与同组剩余行整列被覆盖。
      for (const index of [1, 2, 3, 4]) expect(plan[0][index].hidden).toBe(true)
      // 华北组：无子行 → 与扁平行语义一致。
      expect(plan[0][5]).toEqual({ hidden: false, colSpan: 1, rowSpan: 2 })
      expect(plan[0][6].hidden).toBe(true)
    })

    it('keeps flat-row semantics when rowLevels is omitted', () => {
      const plan = computeCellMergePlan(
        groupColumn([3, undefined, undefined, 0, 0, 2, 0]),
        treeRows,
      )!

      // 无层级信息 → 旧的扁平行口径（配额被子行吃掉，合并格停在子行末尾）。
      expect(plan[0][0]).toEqual({ hidden: false, colSpan: 1, rowSpan: 3 })
      expect(plan[0][3].hidden).toBe(true)
      expect(plan[0][4].hidden).toBe(true)
    })

    it('clips the folded track range at the last row', () => {
      const plan = computeCellMergePlan(
        groupColumn([5, 0, 0, 0, 0, 0, 0]),
        treeRows,
        levels,
      )!

      // 声明 5 行但从第 0 行起只有 7 条轨道（含子行）→ 到末行为止。
      expect(plan[0][0]).toEqual({ hidden: false, colSpan: 1, rowSpan: 7 })
    })
  })
})
