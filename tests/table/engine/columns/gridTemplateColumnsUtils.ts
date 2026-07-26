import { describe, expect, it } from 'vitest'
import {
  computeColumnTrack,
  computeGridTemplateColumns,
} from '../../../../src/table/engine/gridTemplateColumnsUtils'
import type { EngineLeafColumn } from '../../../../src/table/engine/types'

type TestLeafColumn = Pick<
  EngineLeafColumn,
  'fixed' | 'gridColumnOptions' | 'hidden' | 'key' | 'width'
>

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

  it('keeps explicit widths fixed and lets unspecified columns fill remaining space in fixed layout', () => {
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
    ).toBe('120px 80px minmax(0, 1fr)')
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

  it('uses numeric widths as proportional fr weights when every visible column has width', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({ key: 'ticket', width: 72 }),
          column({ key: 'queue', width: 112 }),
          column({ key: 'owner', width: '96px' }),
          column({ key: 'sla', width: 80 }),
        ],
        resizedWidths: new Map(),
        tableLayout: 'fixed',
      }),
    ).toBe('minmax(0, 72fr) minmax(0, 112fr) minmax(0, 96fr) minmax(0, 80fr)')
  })

  it('uses antd-like remaining-width fill when any visible column lacks a width', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({ key: 'ticket', width: 72 }),
          column({ key: 'queue' }),
        ],
        resizedWidths: new Map(),
        tableLayout: 'fixed',
      }),
    ).toBe('72px minmax(0, 1fr)')
  })

  it('keeps resized widths as px instead of proportional fr weights', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({ key: 'ticket', width: 72 }),
          column({ key: 'queue', width: 112 }),
        ],
        resizedWidths: new Map([['ticket', 96]]),
        tableLayout: 'fixed',
      }),
    ).toBe('96px minmax(112px, 1fr)')
  })

  it('uses column gridColumnOptions minWidth and maxWidth in auto layout', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({
            key: 'title',
            gridColumnOptions: { minWidth: 160, maxWidth: 360 },
          }),
          column({ key: 'fill' }),
        ],
        resizedWidths: new Map(),
        tableLayout: 'auto',
      }),
    ).toBe('minmax(160px, 360px) minmax(min-content, 1fr)')
  })

  it('uses only maxWidth with the auto-layout min-content default', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({
            key: 'title',
            gridColumnOptions: { maxWidth: 420 },
          }),
        ],
        resizedWidths: new Map(),
        tableLayout: 'auto',
      }),
    ).toBe('minmax(min-content, 420px)')
  })

  it('uses only minWidth with the fixed-layout fill default', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({
            key: 'title',
            gridColumnOptions: { minWidth: '12rem' },
          }),
        ],
        resizedWidths: new Map(),
        tableLayout: 'fixed',
      }),
    ).toBe('minmax(12rem, 1fr)')
  })

  it('does not use proportional fixed-layout tracks when a column has min/max constraints', () => {
    expect(
      computeGridTemplateColumns({
        leafColumns: [
          column({
            key: 'title',
            width: 180,
            gridColumnOptions: { minWidth: 120, maxWidth: 320 },
          }),
          column({ key: 'owner', width: 96 }),
        ],
        resizedWidths: new Map(),
        tableLayout: 'fixed',
      }),
    ).toBe('minmax(120px, 320px) minmax(96px, 1fr)')
  })
})
