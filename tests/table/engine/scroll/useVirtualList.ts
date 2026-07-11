import { describe, expect, it } from 'vitest'
import {
  applySizeRanges,
  initialRowSizeState,
} from '../../../../src/table/engine/rowSizeSystem'
import {
  computeScrollTarget,
  computeVirtualRange,
  findNearestIndex,
  findStartIndexByOffset,
  type VirtualRowMeasurement,
} from '../../../../src/table/engine/virtualListUtils'

function measurements(count: number, size: number): Array<VirtualRowMeasurement> {
  const out: Array<VirtualRowMeasurement> = []
  let offset = 0
  for (let index = 0; index < count; index += 1) {
    out.push({
      index,
      offsetStart: offset,
      offsetEnd: offset + size,
      size,
    })
    offset += size
  }
  return out
}

describe('useVirtualList pure helpers / findNearestIndex', () => {
  it('finds the row containing a fallback offset', () => {
    const rows = measurements(5, 20)

    expect(findNearestIndex(rows, 0)).toBe(0)
    expect(findNearestIndex(rows, 39)).toBe(1)
    expect(findNearestIndex(rows, 40)).toBe(2)
    expect(findNearestIndex(rows, 100)).toBe(5)
  })
})

describe('useVirtualList pure helpers / computeVirtualRange', () => {
  it('returns the full range when disabled and an empty range for no items', () => {
    expect(
      computeVirtualRange({
        enabled: false,
        itemCount: 10,
        overscan: 2,
        scrollTop: 100,
        viewportSize: 40,
        contentOffset: 0,
        gap: 0,
        measurements: measurements(10, 20),
      }),
    ).toEqual({ start: 0, end: 10 })

    expect(
      computeVirtualRange({
        enabled: true,
        itemCount: 0,
        overscan: 2,
        scrollTop: 0,
        viewportSize: 40,
        contentOffset: 0,
        gap: 0,
        measurements: [],
      }),
    ).toEqual({ start: 0, end: 0 })
  })

  it('uses a bounded initial count before viewport size is known', () => {
    expect(
      computeVirtualRange({
        enabled: true,
        itemCount: 10,
        overscan: 2,
        scrollTop: 0,
        viewportSize: 0,
        contentOffset: 0,
        gap: 0,
        measurements: measurements(10, 20),
      }),
    ).toEqual({ start: 0, end: 5 })
  })

  it('computes fallback measurement ranges with overscan and bounds', () => {
    expect(
      computeVirtualRange({
        enabled: true,
        itemCount: 10,
        overscan: 1,
        scrollTop: 45,
        viewportSize: 40,
        contentOffset: 0,
        gap: 0,
        measurements: measurements(10, 20),
      }),
    ).toEqual({ start: 1, end: 5 })

    expect(
      computeVirtualRange({
        enabled: true,
        itemCount: 10,
        overscan: 3,
        scrollTop: 0,
        viewportSize: 20,
        contentOffset: 0,
        gap: 0,
        measurements: measurements(10, 20),
      }),
    ).toEqual({ start: 0, end: 4 })
  })

  it('computes ranges from measured row-size offset trees', () => {
    const rowSizes = applySizeRanges(
      initialRowSizeState(),
      [
        { startIndex: 0, endIndex: 4, size: 10 },
        { startIndex: 5, endIndex: 9, size: 30 },
      ],
      2,
    )

    expect(findStartIndexByOffset(64, rowSizes, 2)).toBe(5)
    expect(
      computeVirtualRange({
        enabled: true,
        itemCount: 10,
        overscan: 1,
        scrollTop: 64,
        viewportSize: 40,
        contentOffset: 0,
        gap: 2,
        measurements: measurements(10, 20),
        rowSizes,
      }),
    ).toEqual({ start: 4, end: 7 })
  })

  it('subtracts contentOffset from the effective viewport and scroll position', () => {
    expect(
      computeVirtualRange({
        enabled: true,
        itemCount: 10,
        overscan: 1,
        scrollTop: 65,
        viewportSize: 60,
        contentOffset: 20,
        gap: 0,
        measurements: measurements(10, 20),
      }),
    ).toEqual({ start: 1, end: 5 })
  })
})

describe('useVirtualList pure helpers / computeScrollTarget', () => {
  const base = {
    itemCount: 10,
    offset: 0,
    align: 'start' as const,
    clientHeight: 100,
    scrollHeight: 220,
    contentOffset: 0,
    currentScrollTop: 0,
    viewportSize: 100,
    offsetOf: (index: number) => index * 20,
    sizeOf: () => 20,
  }

  it('uses explicit scrollTop and clamps to the scrollable range', () => {
    expect(computeScrollTarget({ ...base, scrollTop: 150 })).toBe(120)
    expect(computeScrollTarget({ ...base, scrollTop: -10 })).toBe(0)
  })

  it('computes index targets for start, center, and end alignment', () => {
    expect(computeScrollTarget({ ...base, index: 3, align: 'start' })).toBe(60)
    expect(computeScrollTarget({ ...base, index: 4, align: 'center' })).toBe(40)
    expect(computeScrollTarget({ ...base, index: 4, align: 'end' })).toBe(0)
  })

  it('returns null for nearest alignment when the row is already visible', () => {
    expect(computeScrollTarget({ ...base, index: 2, align: 'nearest' })).toBeNull()
  })

  it('scrolls the nearest edge when the row is outside the viewport', () => {
    expect(computeScrollTarget({ ...base, index: 8, align: 'nearest' })).toBe(80)
    expect(
      computeScrollTarget({
        ...base,
        index: 1,
        align: 'nearest',
        currentScrollTop: 80,
      }),
    ).toBe(20)
  })

  it('clamps index and applies offset after alignment', () => {
    expect(computeScrollTarget({ ...base, index: 99, align: 'start' })).toBe(120)
    expect(computeScrollTarget({ ...base, index: 1, offset: 5 })).toBe(25)
  })

  it('returns null when no target can be resolved', () => {
    expect(computeScrollTarget({ ...base, itemCount: 0, index: 0 })).toBeNull()
    expect(computeScrollTarget({ ...base })).toBeNull()
  })
})
