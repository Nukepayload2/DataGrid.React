import { describe, expect, it, vi } from 'vitest'
import {
  extractRestElementProps,
  resolveBodyCellInjectedProps,
  resolveRowClassName,
  splitElementProps,
} from '../../../../src/table/engine/bodyCellUtils'
import type { EngineLeafColumn, EngineTableProps } from '../../../../src/table/engine/types'

describe('bodyCellUtils', () => {
  it('resolves rowClassName values defensively', () => {
    const record = { id: 1 }

    expect(resolveRowClassName(undefined, record, 0)).toBeUndefined()
    expect(resolveRowClassName('row-static', record, 0)).toBe('row-static')
    expect(resolveRowClassName((row, index) => `row-${row.id}-${index}`, record, 2)).toBe('row-1-2')
    expect(resolveRowClassName(() => {
      throw new Error('boom')
    }, record, 0)).toBeUndefined()
  })

  it('splits className/style from rest element props without mutating input', () => {
    const onClick = vi.fn()
    const props = {
      className: 'row',
      style: { color: 'red' },
      onClick,
      tabIndex: 0,
    }

    expect(extractRestElementProps(props)).toEqual({ onClick, tabIndex: 0 })
    expect(splitElementProps(props)).toEqual({
      className: 'row',
      style: { color: 'red' },
      restProps: { onClick, tabIndex: 0 },
    })
    expect(props).toEqual({
      className: 'row',
      style: { color: 'red' },
      onClick,
      tabIndex: 0,
    })
  })

  it('resolves body cell injected props for custom cells and row props', () => {
    type Row = { id: number }
    const record = { id: 7 }
    const onCell = vi.fn(() => ({ editable: true }))
    const onMouseEnter = vi.fn()
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      className: 'col',
      style: { color: 'blue' },
      onCell,
    }
    const components: EngineTableProps<Row>['components'] = {
      body: { cell: () => null },
    }

    const result = resolveBodyCellInjectedProps({
      column,
      record,
      index: 3,
      components,
      onRow: () => ({
        className: 'row',
        style: { backgroundColor: 'yellow' },
        onMouseEnter,
      }),
      rowClassName: (row) => `row-${row.id}`,
      isRowSelected: (row) => row.id === 7,
    })

    expect(onCell).toHaveBeenCalledWith(record, 3)
    expect(result.onCellProps).toEqual({ editable: true })
    expect(result.rowClassName).toBe('row-7')
    expect(result.selectedClass).toBe('dg-row-selected')
    expect(result.mergedClassName).toBe('col row-7 row')
    expect(result.mergedStyle).toEqual({ color: 'blue', backgroundColor: 'yellow' })
    expect(result.restRowProps).toEqual({ onMouseEnter })
  })

  it('merges RenderedCell props into default cell props without leaking span attrs', () => {
    const onClick = vi.fn()
    const result = resolveBodyCellInjectedProps({
      column: { key: 'name', className: 'col', style: { color: 'blue' } },
      record: { id: 1 },
      index: 0,
      components: undefined,
      renderedCellProps: {
        className: 'rendered',
        style: { backgroundColor: 'yellow' },
        onClick,
        colSpan: 2,
        rowSpan: 3,
      },
    })

    expect(result.onCellProps).toEqual({
      className: 'rendered',
      style: { backgroundColor: 'yellow' },
      onClick,
      colSpan: 2,
      rowSpan: 3,
    })
    expect(result.mergedClassName).toBe('col rendered')
    expect(result.mergedStyle).toEqual({ color: 'blue', backgroundColor: 'yellow' })
    expect(result.restRowProps).toEqual({ onClick })
  })

  it('skips onCell when no custom body cell exists and swallows user callback errors', () => {
    const onCell = vi.fn(() => ({ editable: true }))
    const column: EngineLeafColumn<{ id: number }> = { key: 'name', onCell }

    expect(resolveBodyCellInjectedProps({
      column,
      record: { id: 1 },
      index: 0,
      components: undefined,
      onRow: () => {
        throw new Error('boom')
      },
      rowClassName: () => {
        throw new Error('boom')
      },
    })).toMatchObject({
      onCellProps: undefined,
      rowClassName: undefined,
      mergedClassName: undefined,
      mergedStyle: {},
      restRowProps: {},
    })
    expect(onCell).not.toHaveBeenCalled()
  })
})
