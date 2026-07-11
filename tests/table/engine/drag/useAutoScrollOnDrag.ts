import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computeAxisDelta,
  findScrollContainer,
  useAutoScrollOnDrag,
} from '../../../../src/table/engine/useAutoScrollOnDrag'

describe('useAutoScrollOnDrag / computeAxisDelta', () => {
  it('accelerates toward the start and end edges', () => {
    expect(computeAxisDelta(0, 0, 500)).toBe(-15)
    expect(computeAxisDelta(50, 0, 500)).toBe(-7.5)
    expect(computeAxisDelta(250, 0, 500)).toBe(0)
    expect(computeAxisDelta(450, 0, 500)).toBe(7.5)
    expect(computeAxisDelta(500, 0, 500)).toBe(15)
  })

  it('clamps pointers outside the container to maximum speed', () => {
    expect(computeAxisDelta(-20, 0, 500)).toBe(-15)
    expect(computeAxisDelta(520, 0, 500)).toBe(15)
  })
})

describe('useAutoScrollOnDrag / DOM integration', () => {
  const originalRaf = globalThis.requestAnimationFrame
  const originalCancelRaf = globalThis.cancelAnimationFrame
  let rafCallbacks: Array<FrameRequestCallback>

  beforeEach(() => {
    rafCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      writable: true,
      value: originalRaf,
    })
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      writable: true,
      value: originalCancelRaf,
    })
  })

  it('finds the inner dg-scroll container first', () => {
    const root = document.createElement('div')
    const scroll = document.createElement('div')
    scroll.className = 'dg-scroll'
    root.append(scroll)

    expect(findScrollContainer(root)).toBe(scroll)
  })

  it('scrolls vertically near the bottom edge while running', () => {
    const root = document.createElement('div')
    const scroll = document.createElement('div')
    scroll.className = 'dg-scroll'
    root.append(scroll)
    Object.defineProperty(scroll, 'scrollHeight', { configurable: true, value: 900 })
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, value: 300 })
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 100,
      top: 0,
      bottom: 300,
      width: 100,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    const scrollBy = vi.fn()
    scroll.scrollBy = scrollBy

    const ref = { current: root }
    const { result } = renderHook(() =>
      useAutoScrollOnDrag({ containerRef: ref, vertical: true, autoScroll: true }),
    )

    result.current.pointerRef.current = { clientX: 50, clientY: 295 }
    act(() => result.current.start())
    expect(rafCallbacks).toHaveLength(1)

    act(() => rafCallbacks[0]!(0))

    expect(scrollBy).toHaveBeenCalledWith(0, 14.25)
    expect(rafCallbacks).toHaveLength(2)

    act(() => result.current.stop())
    expect(result.current.pointerRef.current).toEqual({ clientX: 0, clientY: 0 })
  })

  it('scrolls horizontally near the left edge while running', () => {
    const root = document.createElement('div')
    const scroll = document.createElement('div')
    scroll.className = 'dg-scroll'
    root.append(scroll)
    Object.defineProperty(scroll, 'scrollWidth', { configurable: true, value: 500 })
    Object.defineProperty(scroll, 'clientWidth', { configurable: true, value: 100 })
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 100,
      top: 0,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    const scrollBy = vi.fn()
    scroll.scrollBy = scrollBy

    const ref = { current: root }
    const { result } = renderHook(() =>
      useAutoScrollOnDrag({ containerRef: ref, vertical: false, autoScroll: true }),
    )

    result.current.pointerRef.current = { clientX: 10, clientY: 50 }
    act(() => result.current.start())
    act(() => rafCallbacks[0]!(0))

    expect(scrollBy).toHaveBeenCalledWith(-13.5, 0)
  })
})
