import { describe, expect, it } from 'vitest'
import {
  computeColumnTrack,
  computeGridTemplateColumns,
} from '../../../../src/table/engine/gridTemplateColumnsUtils'
import type { EngineLeafColumn } from '../../../../src/table/engine/types'

type TestLeafColumn = Pick<EngineLeafColumn, 'fixed' | 'hidden' | 'key' | 'width'>

function column(columnDef: TestLeafColumn): TestLeafColumn {
  return columnDef
}

describe('gridTemplateColumnsUtils', () => {
  it('computes the grid-template-columns string in leaf order', () => {
    const leafColumns = [
      column({ key: 'hidden', hidden: true, width: 100 }),
      column({ key: 'resized', width: 120 }),
      column({ key: 'fixed', fixed: 'start', width: 160 }),
      column({ key: 'percent', width: '25%' }),
      column({ key: 'autoWidth', width: 180 }),
      column({ key: 'fill' }),
    ]

    expect(
      computeGridTemplateColumns({
        leafColumns,
        resizedWidths: new Map([['resized', 144]]),
        tableLayout: 'auto',
      }),
    ).toBe(
      '0fr 144px 160px 25% minmax(180px, max-content) minmax(min-content, 1fr)',
    )
  })

  it('lets non-fixed absolute width columns fill remaining space in fixed layout', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({ key: 'width', width: 120 }),
          column({ key: 'fixed', fixed: 'end', width: 80 }),
          column({ key: 'fill' }),
        ],
        resizedWidths: new Map(),
        tableLayout: 'fixed',
      }),
    ).toBe('minmax(120px, 1fr) 80px minmax(0, 1fr)')
  })

  it('returns none when there are no leaf columns', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [],
        resizedWidths: new Map(),
        tableLayout: 'auto',
      }),
    ).toBe('none')
  })

  it('computes a single column track', () => {
    expect(
      computeColumnTrack(
        column({ key: 'name', width: 'max-content' }),
        new Map(),
        'auto',
      ),
    ).toBe('minmax(max-content, max-content)')
  })
})
