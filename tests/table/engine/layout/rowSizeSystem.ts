import { describe, expect, it } from 'vitest'
import {
  applySizeRanges,
  initialRowSizeState,
  offsetOf,
  rangesWithinOffsets,
  sizeOf,
  sizeTreeToRanges,
  totalHeight,
} from '../../../../src/table/engine/rowSizeSystem'

describe('rowSizeSystem', () => {
  it('starts empty', () => {
    const state = initialRowSizeState()

    expect(sizeOf(0, state)).toBe(0)
    expect(offsetOf(0, state, 2)).toBe(0)
    expect(totalHeight(10, state, 2)).toBe(0)
    expect(sizeTreeToRanges(state)).toEqual([])
    expect(rangesWithinOffsets(state, 0, 100)).toEqual([])
  })

  it('applies the first range and answers size, offset, and total height queries', () => {
    const state = applySizeRanges(initialRowSizeState(), [{ startIndex: 0, endIndex: 9, size: 20 }], 2)

    expect(sizeOf(0, state)).toBe(20)
    expect(sizeOf(99, state)).toBe(20)
    expect(offsetOf(0, state, 2)).toBe(0)
    expect(offsetOf(1, state, 2)).toBe(22)
    expect(totalHeight(3, state, 2)).toBe(64)
    expect(sizeTreeToRanges(state)).toEqual([{ startIndex: 0, endIndex: Infinity, size: 20 }])
  })

  it('returns the same state reference when reapplying an identical range', () => {
    const state = applySizeRanges(initialRowSizeState(), [{ startIndex: 0, endIndex: 9, size: 20 }], 2)

    expect(applySizeRanges(state, [{ startIndex: 0, endIndex: Infinity, size: 20 }], 2)).toBe(state)
  })

  it('splits and merges overlapping ranges', () => {
    let state = applySizeRanges(initialRowSizeState(), [{ startIndex: 0, endIndex: 9, size: 20 }], 2)
    state = applySizeRanges(state, [{ startIndex: 2, endIndex: 4, size: 30 }], 2)

    expect(sizeTreeToRanges(state)).toEqual([
      { startIndex: 0, endIndex: 1, size: 20 },
      { startIndex: 2, endIndex: 4, size: 30 },
      { startIndex: 5, endIndex: Infinity, size: 20 },
    ])
    expect(offsetOf(2, state, 2)).toBe(44)
    expect(offsetOf(3, state, 2)).toBe(76)
    expect(totalHeight(6, state, 2)).toBe(160)

    state = applySizeRanges(state, [{ startIndex: 1, endIndex: 5, size: 20 }], 2)
    expect(sizeTreeToRanges(state)).toEqual([{ startIndex: 0, endIndex: Infinity, size: 20 }])
  })

  it('finds offset ranges and honors minStartIndex', () => {
    let state = applySizeRanges(initialRowSizeState(), [{ startIndex: 0, endIndex: 9, size: 20 }], 2)
    state = applySizeRanges(state, [{ startIndex: 2, endIndex: 4, size: 30 }], 2)

    expect(rangesWithinOffsets(state, 50, 100)).toEqual([
      { start: 2, end: Infinity, value: { index: 2, offset: 44, size: 30 } },
    ])
    expect(rangesWithinOffsets(state, 0, 200, 5)).toEqual([
      { start: 5, end: Infinity, value: { index: 5, offset: 140, size: 20 } },
    ])
  })
})
