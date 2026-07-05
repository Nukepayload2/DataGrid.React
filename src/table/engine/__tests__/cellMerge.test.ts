import { describe, expect, it } from 'vitest'
import { computeCellMergePlan } from '../cellMerge'
import type { EngineLeafColumn } from '../types'

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
})
