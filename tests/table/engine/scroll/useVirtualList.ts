import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applySizeRanges,
  initialRowSizeState,
} from '../../../../src/table/engine/rowSizeSystem'
import { useVirtualList } from '../../../../src/table/engine/useVirtualList'
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

function createScrollElement(options: {
  clientHeight: number
  scrollHeight: number
  scrollTop?: number
}): HTMLDivElement {
  const el = document.createElement('div')
  let scrollTop = options.scrollTop ?? 0
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => options.clientHeight,
  })
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => options.scrollHeight,
  })
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value
    },
  })
  el.scrollTo = vi.fn((arg: ScrollToOptions | number, y?: number) => {
    if (typeof arg === 'number') {
      scrollTop = y ?? arg
    } else {
      scrollTop = arg.top ?? scrollTop
    }
  })
  document.body.appendChild(el)
  return el
}

function refOf<T extends HTMLElement>(current: T): React.RefObject<T> {
  return { current }
}

function mockQueuedRaf(): { flush: () => void } {
  const callbacks: FrameRequestCallback[] = []
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    callbacks.push(callback)
    return callbacks.length
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
  return {
    flush: () => {
      while (callbacks.length > 0) {
        const callback = callbacks.shift()!
        act(() => {
          callback(performance.now())
        })
      }
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

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

  it('computes fixed-row-height ranges without fallback measurements', () => {
    expect(
      computeVirtualRange({
        enabled: true,
        itemCount: 1_048_576,
        overscan: 2,
        scrollTop: 405,
        viewportSize: 80,
        contentOffset: 0,
        gap: 0,
        fixedRowHeight: 20,
        measurements: [],
      }),
    ).toEqual({ start: 18, end: 26 })
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

describe('useVirtualList hook', () => {
  it('publishes the initial viewport and updates range on scroll events', async () => {
    mockQueuedRaf()
    const el = createScrollElement({ clientHeight: 60, scrollHeight: 400 })
    const containerRef = refOf(el)
    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 20,
        getRowHeight: () => 20,
        containerRef,
        overscan: 1,
      }),
    )

    expect(result.current.viewportSize).toBe(60)
    expect(result.current.scrollTop).toBe(0)
    expect(result.current.start).toBe(0)
    expect(result.current.end).toBe(4)

    act(() => {
      el.scrollTop = 80
      el.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.scrollTop).toBe(80)
    expect(result.current.start).toBe(3)
    expect(result.current.end).toBe(8)
    expect(result.current.isScrolling).toBe(true)
    expect(result.current.scrollDirection).toBe('down')

    await waitFor(() => {
      expect(result.current.scrollDirection).toBe('none')
    })

    await waitFor(() => {
      expect(result.current.isScrolling).toBe(false)
    })
  })

  it('returns the full range while disabled and skips scroll observation', () => {
    const el = createScrollElement({ clientHeight: 60, scrollHeight: 400 })
    const addEventListenerSpy = vi.spyOn(el, 'addEventListener')
    const containerRef = refOf(el)
    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 20,
        getRowHeight: () => 20,
        containerRef,
        enabled: false,
      }),
    )

    expect(result.current.start).toBe(0)
    expect(result.current.end).toBe(20)
    expect(result.current.viewportSize).toBe(0)
    expect(addEventListenerSpy).not.toHaveBeenCalled()
  })

  it('scrolls immediately to explicit offsets and row indexes', () => {
    mockQueuedRaf()
    const el = createScrollElement({ clientHeight: 60, scrollHeight: 400 })
    const containerRef = refOf(el)
    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 20,
        getRowHeight: () => 20,
        containerRef,
        overscan: 1,
      }),
    )

    act(() => {
      result.current.scrollTo({ scrollTop: 500 })
    })
    expect(el.scrollTop).toBe(340)
    expect(result.current.scrollTop).toBe(340)

    act(() => {
      result.current.scrollTo({ index: 3, align: 'start', offset: 5 })
    })
    expect(el.scrollTop).toBe(65)
    expect(result.current.scrollTop).toBe(65)
  })

  it('uses fixedRowHeight without allocating fallback measurements', () => {
    mockQueuedRaf()
    const el = createScrollElement({ clientHeight: 80, scrollHeight: 20_971_520 })
    const containerRef = refOf(el)
    const getRowHeight = vi.fn(() => 20)
    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 1_048_576,
        getRowHeight,
        containerRef,
        overscan: 1,
        measurementEnabled: false,
        fixedRowHeight: 20,
      }),
    )

    expect(result.current.measurements).toHaveLength(0)
    expect(result.current.totalSize).toBe(20_971_520)
    expect(result.current.start).toBe(0)
    expect(result.current.end).toBe(5)
    expect(getRowHeight).not.toHaveBeenCalled()

    act(() => {
      result.current.scrollTo({ index: 500_000, align: 'start' })
    })

    expect(el.scrollTop).toBe(10_000_000)
    expect(result.current.scrollTop).toBe(10_000_000)
    expect(getRowHeight).not.toHaveBeenCalled()
  })

  it('keeps nearest row scroll requests as no-ops when already visible', () => {
    mockQueuedRaf()
    const el = createScrollElement({ clientHeight: 80, scrollHeight: 400 })
    const containerRef = refOf(el)
    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 20,
        getRowHeight: () => 20,
        containerRef,
      }),
    )

    act(() => {
      result.current.scrollTo({ index: 2, align: 'nearest' })
    })

    expect(el.scrollTop).toBe(0)
    expect(result.current.scrollTop).toBe(0)
  })

  it('uses measured row sizes when row measurement reports changes', () => {
    const el = createScrollElement({ clientHeight: 80, scrollHeight: 500 })
    const raf = mockQueuedRaf()
    const containerRef = refOf(el)
    const rows = [30, 30, 50]
    rows.forEach((height, index) => {
      const row = document.createElement('div')
      row.dataset.rowIndex = String(index)
      row.dataset.knownSize = '20'
      Object.defineProperty(row, 'offsetHeight', {
        configurable: true,
        get: () => height,
      })
      Object.defineProperty(row, 'offsetParent', {
        configurable: true,
        get: () => el,
      })
      el.appendChild(row)
    })

    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 3,
        getRowHeight: () => 20,
        containerRef,
        gap: 2,
      }),
    )

    raf.flush()

    expect(result.current.sizeOf(0)).toBe(30)
    expect(result.current.sizeOf(2)).toBe(50)
    expect(result.current.totalSize).toBe(116)
  })

  it('marks smooth scroll as in progress and clears it after the animation completes', () => {
    const el = createScrollElement({ clientHeight: 60, scrollHeight: 400 })
    const containerRef = refOf(el)
    const rafCallbacks: FrameRequestCallback[] = []
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

    const { result } = renderHook(() =>
      useVirtualList({
        itemCount: 20,
        getRowHeight: () => 20,
        containerRef,
      }),
    )

    act(() => {
      result.current.scrollTo({ index: 10, behavior: 'smooth' })
    })
    expect(result.current.scrollingInProgress).toBe(true)

    while (rafCallbacks.length > 0) {
      const callback = rafCallbacks.shift()!
      act(() => {
        callback(performance.now())
      })
    }

    act(() => {
      el.dispatchEvent(new Event('scroll'))
    })

    expect(el.scrollTop).toBe(200)
    expect(result.current.scrollingInProgress).toBe(false)
  })
})
