import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  stickyCellStyle,
  stickyHeaderCellStyle,
  useLeafColumnsRef,
  useStickyColumns,
} from '../../../../src/table/engine/useStickyColumns'
import type {
  EngineHeaderCell,
  EngineLeafColumn,
} from '../../../../src/table/engine/types'

interface Rec {
  key: string
}

function col(
  key: string,
  fixed?: 'start' | 'end',
  width?: number | string,
): EngineLeafColumn<Rec> {
  return { key, fixed, width } as EngineLeafColumn<Rec>
}

function header(
  key: string,
  options: Partial<EngineHeaderCell<Rec>>,
): EngineHeaderCell<Rec> {
  return {
    key,
    title: key,
    gridColumnStart: 1,
    gridColumnEnd: 2,
    gridRowStart: 1,
    gridRowEnd: 2,
    isLeaf: true,
    ...options,
  } as EngineHeaderCell<Rec>
}

function rect(width: number): DOMRect {
  return {
    left: 0,
    top: 0,
    width,
    height: 20,
    right: width,
    bottom: 20,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect
}

function createGrid(widths: number[], extraInvalid = false): HTMLElement {
  const grid = document.createElement('div')
  widths.forEach((width, index) => {
    const cell = document.createElement('div')
    cell.setAttribute('data-leaf-index', String(index))
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue(rect(width))
    grid.append(cell)
  })
  if (extraInvalid) {
    const invalid = document.createElement('div')
    invalid.setAttribute('data-leaf-index', 'not-a-number')
    vi.spyOn(invalid, 'getBoundingClientRect').mockReturnValue(rect(999))
    grid.append(invalid)

    const outOfRange = document.createElement('div')
    outOfRange.setAttribute('data-leaf-index', '99')
    vi.spyOn(outOfRange, 'getBoundingClientRect').mockReturnValue(rect(999))
    grid.append(outOfRange)
  }
  document.body.append(grid)
  return grid
}

describe('useStickyColumns', () => {
  it('computes sticky offsets from column width fallbacks before DOM measurement', () => {
    const columns = [
      col('a', 'start', 40),
      col('b', 'start', 50),
      col('c', undefined, 60),
      col('d', 'end', 70),
      col('e', 'end', 80),
    ]
    const headers = [
      header('a', { isLeaf: true, leafIndex: 0 }),
      header('start-group', {
        isLeaf: false,
        gridColumnStart: 1,
        gridColumnEnd: 3,
      }),
      header('mixed-group', {
        isLeaf: false,
        gridColumnStart: 2,
        gridColumnEnd: 4,
      }),
      header('end-group', {
        isLeaf: false,
        gridColumnStart: 4,
        gridColumnEnd: 6,
      }),
    ]
    const ref = { current: null }
    const { result } = renderHook(() => useStickyColumns(columns, headers, ref))

    expect(result.current.hasFixed).toBe(true)
    expect(result.current.leafSticky).toMatchObject([
      { side: 'start', offset: 0, width: 40, isEdge: false },
      { side: 'start', offset: 40, width: 50, isEdge: true },
      { side: undefined, offset: 0, width: 60, isEdge: false },
      { side: 'end', offset: 80, width: 70, isEdge: true },
      { side: 'end', offset: 0, width: 80, isEdge: false },
    ])
    expect(result.current.headerSticky.get('a')).toEqual({
      side: 'start',
      offset: 0,
      isEdge: false,
    })
    expect(result.current.headerSticky.get('start-group')).toEqual({
      side: 'start',
      offset: 0,
      isEdge: true,
    })
    expect(result.current.headerSticky.has('mixed-group')).toBe(false)
    expect(result.current.headerSticky.get('end-group')).toEqual({
      side: 'end',
      offset: 0,
      isEdge: true,
    })
  })

  it('measures DOM leaf widths and ignores invalid leaf indexes', async () => {
    const columns = [
      col('a', 'start', 40),
      col('b', 'start', 'max-content'),
      col('c', undefined, 60),
      col('d', 'end', 70),
    ]
    const grid = createGrid([45, 55, 65, 75], true)
    const ref = { current: grid }
    const { result } = renderHook(() => useStickyColumns(columns, [], ref))

    await waitFor(() => {
      expect(result.current.leafSticky[1]?.width).toBe(55)
    })

    expect(result.current.leafSticky).toMatchObject([
      { side: 'start', offset: 0, width: 45, isEdge: false },
      { side: 'start', offset: 45, width: 55, isEdge: true },
      { side: undefined, offset: 0, width: 65, isEdge: false },
      { side: 'end', offset: 0, width: 75, isEdge: true },
    ])
  })

  it('updates width baselines when the leaf column list changes', async () => {
    const grid = createGrid([31, 41])
    const ref = { current: grid }
    const { result, rerender } = renderHook(
      ({ columns }: { columns: EngineLeafColumn<Rec>[] }) =>
        useStickyColumns(columns, [], ref),
      {
        initialProps: {
          columns: [col('a', 'start', 30), col('b', undefined, 40)],
        },
      },
    )

    await waitFor(() => {
      expect(result.current.leafSticky).toHaveLength(2)
      expect(result.current.leafSticky[0]?.width).toBe(31)
    })

    const nextCell = document.createElement('div')
    nextCell.setAttribute('data-leaf-index', '2')
    vi.spyOn(nextCell, 'getBoundingClientRect').mockReturnValue(rect(51))
    grid.append(nextCell)

    rerender({
      columns: [
        col('a', 'start', 30),
        col('b', undefined, 40),
        col('c', 'end', 50),
      ],
    })

    await waitFor(() => {
      expect(result.current.leafSticky).toHaveLength(3)
      expect(result.current.leafSticky[2]).toMatchObject({
        side: 'end',
        offset: 0,
        width: 51,
      })
    })
  })

  it('skips non-sticky and invalid header cells', () => {
    const columns = [col('a'), col('b', 'end', 40)]
    const headers = [
      header('plain-leaf', { isLeaf: true, leafIndex: 0 }),
      header('missing-leaf-index', { isLeaf: true, leafIndex: undefined }),
      header('invalid-group', {
        isLeaf: false,
        gridColumnStart: 0,
        gridColumnEnd: 2,
      }),
      header('end-leaf', { isLeaf: true, leafIndex: 1 }),
    ]
    const { result } = renderHook(() => useStickyColumns(columns, headers, { current: null }))

    expect(result.current.headerSticky.has('plain-leaf')).toBe(false)
    expect(result.current.headerSticky.has('missing-leaf-index')).toBe(false)
    expect(result.current.headerSticky.has('invalid-group')).toBe(false)
    expect(result.current.headerSticky.get('end-leaf')).toEqual({
      side: 'end',
      offset: 0,
      isEdge: true,
    })
  })
})

describe('sticky style helpers', () => {
  it('returns empty styles for non-sticky cells', () => {
    expect(stickyCellStyle(undefined)).toEqual({})
    expect(stickyCellStyle({ side: undefined, offset: 0, width: 0, isEdge: false })).toEqual({})
    expect(stickyHeaderCellStyle(undefined)).toEqual({})
  })

  it('maps start and end sticky info to cell and header styles', () => {
    expect(stickyCellStyle({ side: 'start', offset: 12, width: 40, isEdge: true })).toEqual({
      position: 'sticky',
      left: 12,
      zIndex: 2,
    })
    expect(stickyCellStyle({ side: 'end', offset: 24, width: 40, isEdge: true })).toEqual({
      position: 'sticky',
      right: 24,
      zIndex: 2,
    })
    expect(stickyHeaderCellStyle({ side: 'start', offset: 12 })).toEqual({
      position: 'sticky',
      left: 12,
      zIndex: 3,
    })
    expect(stickyHeaderCellStyle({ side: 'end', offset: 24 })).toEqual({
      position: 'sticky',
      right: 24,
      zIndex: 3,
    })
  })
})

describe('useLeafColumnsRef', () => {
  it('returns a stable getter that reads the latest leaf columns after rerender', () => {
    const first = [col('a')]
    const second = [col('b'), col('c')]
    const { result, rerender } = renderHook(
      ({ columns }: { columns: EngineLeafColumn<Rec>[] }) => useLeafColumnsRef(columns),
      { initialProps: { columns: first } },
    )
    const get = result.current

    expect(get()).toBe(first)

    rerender({ columns: second })

    expect(result.current).toBe(get)
    expect(get()).toBe(second)
  })
})
