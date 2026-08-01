import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clampScrollLeft,
  computeStickyMaxScroll,
  scrollLeftValue,
} from '../../../../src/table/engine/gridScrollUtils'
import { getStickyMaxScroll, StickyScrollBar } from '../../../../src/table/engine/StickyScrollBar'

/**
 * StickyScrollBar 厚单元测试。
 *
 * 覆盖策略：
 * - 纯逻辑（getStickyMaxScroll / computeStickyMaxScroll / clampScrollLeft / scrollLeftValue）
 *   全量喂输入，零 mock。
 * - 组件渲染 + thumb 几何：用真实 DOM 元素喂给 gridRef/viewportRef，通过 stub 的
 *   clientWidth/scrollWidth 驱动 updateThumb 副作用，断言 thumb.style.width / transform。
 * - ResizeObserver：用一个会保存 callback 的 mock 替换全局 ResizeObserver，
 *   在测试里手动触发 callback 模拟尺寸变化。
 * - pointer 拖动 + body.classList：用真实 PointerEvent 派发到 thumb 元素和 window。
 *
 * jsdom 限制：
 * - jsdom 不做真实布局，clientWidth/scrollWidth 默认 0 且赋值无效，必须用
 *   Object.defineProperty 强行 stub。
 * - 派发 PointerEvent 到 window 时，组件读 ev.clientX/ev.pointerId，jsdom 的
 *   PointerEvent 支持这两个字段。
 */

// ---------------------------------------------------------------------------
// 工具：构造带 stub 几何的 DOM 元素作为 ref.current。
// ---------------------------------------------------------------------------

function makeElement(overrides: {
  clientWidth?: number
  scrollWidth?: number
  scrollLeft?: number
  innerWidth?: number
  scrollX?: number
  document?: Document
  scrollTo?: (x: number, y: number) => void
}): HTMLDivElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', {
    configurable: true,
    value: overrides.clientWidth ?? 0,
  })
  Object.defineProperty(el, 'scrollWidth', {
    configurable: true,
    value: overrides.scrollWidth ?? 0,
  })
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    value: overrides.scrollLeft ?? 0,
    writable: true,
  })
  // resolveContainer 通过 `'scrollTo' in c` 判定一个对象是否是 HTMLElement 容器；
  // 没有 scrollTo 的对象会被回退到 window。这里始终挂一个占位 scrollTo 以通过该检测。
  ;(el as unknown as { scrollTo: unknown }).scrollTo =
    overrides.scrollTo ?? (() => {})
  return el
}

// 一个可控的 ResizeObserver mock：保存实例 + callback，测试里手动调用。
type ROCallback = (entries: Array<ResizeObserverEntry>) => void
interface CapturedRO {
  // 组件内部 new 出来的真实实例；测试直接监视/调用它的方法即可。
  instance: TestResizeObserver
  callback: ROCallback
  targets: Set<Element>
}
class TestResizeObserver {
  callback: ROCallback
  targets: Set<Element> = new Set()
  disconnectCalls = 0
  constructor(callback: ROCallback) {
    this.callback = callback
  }
  observe(target: Element): void {
    this.targets.add(target)
  }
  unobserve(target: Element): void {
    this.targets.delete(target)
  }
  disconnect(): void {
    this.disconnectCalls += 1
    this.targets.clear()
  }
}

function installResizeObserverMock(): {
  captured: CapturedRO | null
  history: Array<CapturedRO>
} {
  const state: { captured: CapturedRO | null; history: Array<CapturedRO> } = {
    captured: null,
    history: [],
  }
  class CapturingResizeObserver extends TestResizeObserver {
    constructor(callback: ROCallback) {
      super(callback)
      const captured: CapturedRO = {
        instance: this,
        callback,
        targets: this.targets,
      }
      state.captured = captured
      state.history.push(captured)
    }
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: CapturingResizeObserver,
  })
  return state
}

// jsdom 的 PointerEvent 是真实存在的，构造时需要 pointerId/clientX。
function makePointerEvent(
  type: string,
  init: { pointerId?: number; clientX?: number; clientY?: number },
): PointerEvent {
  return new PointerEvent(type, {
    pointerId: init.pointerId ?? 1,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    bubbles: true,
    cancelable: true,
  })
}

function domRect(init: Partial<DOMRect>): DOMRect {
  const left = init.left ?? 0
  const top = init.top ?? 0
  const width = init.width ?? 0
  const height = init.height ?? 0
  return {
    left,
    top,
    width,
    height,
    right: init.right ?? left + width,
    bottom: init.bottom ?? top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

// ---------------------------------------------------------------------------
// 公共：每例后清理 + 还原 ResizeObserver（setup.ts 装的是空实现的 mock）。
// ---------------------------------------------------------------------------

const originalResizeObserver = globalThis.ResizeObserver

afterEach(() => {
  cleanup()
  document.body.classList.remove('dg-scrollbar-pointer-capturing')
  document.body.classList.remove('dg-sticky-scroll-bar-dragging')
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: originalResizeObserver,
  })
})

// ===========================================================================
// 1. 纯函数：scrollLeftValue / clampScrollLeft / computeStickyMaxScroll
//    （这些是 thumb 几何 + getStickyMaxScroll 的底层；测厚回报最高）
// ===========================================================================

describe('scrollLeftValue', () => {
  it('returns the number when finite', () => {
    expect(scrollLeftValue(0)).toBe(0)
    expect(scrollLeftValue(42)).toBe(42)
    expect(scrollLeftValue(-7)).toBe(-7)
  })
  it('treats non-finite / undefined as 0', () => {
    expect(scrollLeftValue(undefined)).toBe(0)
    expect(scrollLeftValue(Number.NaN)).toBe(0)
    expect(scrollLeftValue(Number.POSITIVE_INFINITY)).toBe(0)
    expect(scrollLeftValue(Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe('clampScrollLeft', () => {
  it('clamps into [0, maxScroll] for finite values', () => {
    expect(clampScrollLeft(50, 100)).toBe(50)
    expect(clampScrollLeft(-5, 100)).toBe(0)
    expect(clampScrollLeft(150, 100)).toBe(100)
    expect(clampScrollLeft(0, 0)).toBe(0)
  })
  it('returns 0 for non-finite input regardless of maxScroll', () => {
    expect(clampScrollLeft(Number.NaN, 100)).toBe(0)
    expect(clampScrollLeft(Number.POSITIVE_INFINITY, 100)).toBe(0)
  })
  it('treats negative maxScroll as 0', () => {
    expect(clampScrollLeft(50, -10)).toBe(0)
    expect(clampScrollLeft(-5, -10)).toBe(0)
  })
})

describe('computeStickyMaxScroll', () => {
  it('returns scrollWidth - viewportClientWidth', () => {
    expect(computeStickyMaxScroll(800, 2000, 1500)).toBe(1200)
  })
  it('falls back to gridClientWidth when gridScrollWidth is 0', () => {
    expect(computeStickyMaxScroll(800, 0, 1500)).toBe(700)
  })
  it('returns 0 when both scroll and client width are 0', () => {
    expect(computeStickyMaxScroll(800, 0, 0)).toBe(0)
  })
  it('treats NaN/undefined as 0 and clamps negative result to 0', () => {
    expect(computeStickyMaxScroll(2000, 800, 0)).toBe(0)
    expect(computeStickyMaxScroll(undefined as unknown as number, 100, 0)).toBe(100)
  })
})

// ===========================================================================
// 2. getStickyMaxScroll（公开导出的纯函数；基于 refs 计算）
// ===========================================================================

describe('getStickyMaxScroll', () => {
  it('returns 0 when either ref is null', () => {
    expect(getStickyMaxScroll(null, null)).toBe(0)
    expect(getStickyMaxScroll(null, makeElement({}))).toBe(0)
    expect(getStickyMaxScroll(makeElement({}), null)).toBe(0)
  })
  it('returns scrollWidth - viewport clientWidth', () => {
    const viewport = makeElement({ clientWidth: 600 })
    const grid = makeElement({ scrollWidth: 1800, clientWidth: 1700 })
    expect(getStickyMaxScroll(viewport, grid)).toBe(1200)
  })
  it('falls back to grid clientWidth when grid scrollWidth is 0', () => {
    const viewport = makeElement({ clientWidth: 600 })
    const grid = makeElement({ scrollWidth: 0, clientWidth: 1500 })
    expect(getStickyMaxScroll(viewport, grid)).toBe(900)
  })
  it('clamps negative results to 0 (viewport >= grid)', () => {
    const viewport = makeElement({ clientWidth: 2000 })
    const grid = makeElement({ scrollWidth: 1500, clientWidth: 1500 })
    expect(getStickyMaxScroll(viewport, grid)).toBe(0)
  })
})

// ===========================================================================
// 3. 组件渲染：bar + thumb 结构 + 初始 style
// ===========================================================================

describe('StickyScrollBar render', () => {
  it('renders a bar with sticky position and a thumb child', () => {
    render(
      <StickyScrollBar
        offsetScroll={12}
        gridRef={{ current: null }}
      />,
    )
    const bar = document.querySelector('.dg-sticky-scroll-bar') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.style.position).toBe('sticky')
    expect(bar.style.bottom).toBe('12px')
    expect(bar.style.zIndex).toBe('6')

    const thumb = bar.querySelector('.dg-sticky-scroll-bar-thumb') as HTMLElement
    expect(thumb).not.toBeNull()
    expect(thumb.tagName).toBe('DIV')
  })
})

// ===========================================================================
// 4. thumb 几何：根据 viewport.clientWidth / grid.scrollWidth 推导宽度 + transform
//    通过受控 ref DOM 元素 + 派发 scroll 事件 / 重渲染驱动 updateThumb。
// ===========================================================================

describe('StickyScrollBar thumb geometry (viewport branch)', () => {
  let roState: { captured: CapturedRO | null; history: Array<CapturedRO> }

  beforeEach(() => {
    roState = installResizeObserverMock()
  })

  function makeROEntry(target: Element): ResizeObserverEntry {
    return {
      target,
      contentRect: { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as unknown as ResizeObserverEntry
  }

  function renderBar(opts: {
    viewportClientWidth: number
    gridScrollWidth: number
    gridClientWidth: number
    barClientWidth: number
    scrollLeft: number
    onScrollLeftChange?: (next: number) => void
  }) {
    const grid = makeElement({
      clientWidth: opts.gridClientWidth,
      scrollWidth: opts.gridScrollWidth,
    })
    const viewport = makeElement({ clientWidth: opts.viewportClientWidth })
    const gridRef = { current: grid }
    const viewportRef = { current: viewport }

    const utils = render(
      <StickyScrollBar
        offsetScroll={0}
        gridRef={gridRef}
        viewportRef={viewportRef}
        scrollLeft={opts.scrollLeft}
        onScrollLeftChange={opts.onScrollLeftChange}
      />,
    )

    const bar = document.querySelector('.dg-sticky-scroll-bar') as HTMLElement
    const thumb = bar.querySelector('.dg-sticky-scroll-bar-thumb') as HTMLElement
    // bar.clientWidth 在 jsdom 默认 0，需要 stub 才能让 thumb 计算成立。
    Object.defineProperty(bar, 'clientWidth', {
      configurable: true,
      value: opts.barClientWidth,
    })
    // mount 时 updateThumb 已经用 bar.clientWidth=0 跑过一次，结论可能基于错误几何。
    // 在 stub 就位后，再触发一次 ResizeObserver 回调让 updateThumb 用正确几何重算。
    if (roState.captured) {
      act(() => {
        roState.captured!.callback([makeROEntry(grid), makeROEntry(viewport)])
      })
    }
    return { ...utils, grid, viewport, gridRef, viewportRef, bar, thumb }
  }

  it('hides bar and resets scroll when content fits (maxScroll <= 1)', () => {
    const onScrollLeftChange = vi.fn()
    const { bar } = renderBar({
      viewportClientWidth: 1000,
      gridScrollWidth: 1000, // maxScroll = 0
      gridClientWidth: 1000,
      barClientWidth: 1000,
      scrollLeft: 0,
      onScrollLeftChange,
    })
    expect(bar.style.display).toBe('none')
  })

  it('resets an out-of-range scrollLeft to 0 when content fits', () => {
    const onScrollLeftChange = vi.fn()
    const { bar } = renderBar({
      viewportClientWidth: 1000,
      gridScrollWidth: 1000,
      gridClientWidth: 1000,
      barClientWidth: 1000,
      scrollLeft: 200, // maxScroll<=1 分支应触发 onScrollLeftChange(0)
      onScrollLeftChange,
    })
    expect(bar.style.display).toBe('none')
    expect(onScrollLeftChange).toHaveBeenCalledWith(0)
  })

  it('sizes thumb = max(20, barWidth * clientWidth / scrollWidth)', () => {
    const { bar, thumb } = renderBar({
      viewportClientWidth: 400,
      gridScrollWidth: 1000,
      gridClientWidth: 1000,
      barClientWidth: 800,
      scrollLeft: 0,
    })
    expect(bar.style.display).toBe('block')
    // 800 * 400/1000 = 320
    expect(thumb.style.width).toBe('320px')
    // scrollLeft=0 → ratio=0 → translateX(0)
    expect(thumb.style.transform).toBe('translateX(0px)')
  })

  it('enforces 20px thumb floor when content is very wide', () => {
    const { thumb } = renderBar({
      viewportClientWidth: 10,
      gridScrollWidth: 10000,
      gridClientWidth: 10000,
      barClientWidth: 100,
      scrollLeft: 0,
    })
    // 100 * 10/10000 = 0.1 → max(20, 0.1) = 20
    expect(thumb.style.width).toBe('20px')
  })

  it('translates thumb by ratio * (barWidth - thumbWidth)', () => {
    const { thumb } = renderBar({
      viewportClientWidth: 400,
      gridScrollWidth: 1000,
      gridClientWidth: 1000,
      barClientWidth: 800,
      scrollLeft: 300, // maxScroll=600, ratio=0.5
    })
    // thumbWidth=320, thumbMaxLeft=480, ratio=0.5 → 240
    expect(thumb.style.transform).toBe('translateX(240px)')
  })

  it('clamps scrollLeft to maxScroll via onScrollLeftChange when out of range', () => {
    const onScrollLeftChange = vi.fn()
    const { thumb } = renderBar({
      viewportClientWidth: 400,
      gridScrollWidth: 1000,
      gridClientWidth: 1000,
      barClientWidth: 800,
      scrollLeft: 9999, // 超过 maxScroll=600，应触发 clamp 回调并早返回
      onScrollLeftChange,
    })
    expect(onScrollLeftChange).toHaveBeenCalledWith(600)
    // 早返回：thumb 在本帧没有更新（仍保持初始 20px / 无 transform）
    expect(thumb.style.width).toBe('20px')
  })
})

// ===========================================================================
// 5. ResizeObserver 触发 thumb 重算
// ===========================================================================

describe('StickyScrollBar ResizeObserver', () => {
  it('observes grid and viewport, recomputes thumb on size change', () => {
    const roState = installResizeObserverMock()

    const grid = makeElement({ clientWidth: 1000, scrollWidth: 2000 })
    const viewport = makeElement({ clientWidth: 500 })
    const gridRef = { current: grid }
    const viewportRef = { current: viewport }

    render(
      <StickyScrollBar
        offsetScroll={0}
        gridRef={gridRef}
        viewportRef={viewportRef}
        scrollLeft={0}
      />,
    )

    // 初次 mount 应该创建一个 ResizeObserver 实例并 observe 两个目标。
    expect(roState.captured).not.toBeNull()
    expect(roState.captured!.targets.has(grid)).toBe(true)
    expect(roState.captured!.targets.has(viewport)).toBe(true)

    const bar = document.querySelector('.dg-sticky-scroll-bar') as HTMLElement
    const thumb = bar.querySelector('.dg-sticky-scroll-bar-thumb') as HTMLElement
    Object.defineProperty(bar, 'clientWidth', { configurable: true, value: 800 })

    // 模拟尺寸变化：把 grid.scrollWidth 改大（注意它是 defineProperty，要重新 define）。
    Object.defineProperty(grid, 'scrollWidth', {
      configurable: true,
      value: 4000,
    })

    act(() => {
      roState.captured!.callback([
        {
          target: grid,
          contentRect: { x: 0, y: 0, width: 4000, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as unknown as ResizeObserverEntry,
      ])
    })

    // thumbRatio = 500/4000 = 0.125 → thumbWidth = max(20, 800*0.125)=100
    expect(thumb.style.width).toBe('100px')
  })

  it('disconnects the ResizeObserver on unmount', () => {
    const roState = installResizeObserverMock()
    const gridRef = { current: makeElement({ clientWidth: 1000, scrollWidth: 2000 }) }
    const viewportRef = { current: makeElement({ clientWidth: 500 }) }

    const { unmount } = render(
      <StickyScrollBar
        offsetScroll={0}
        gridRef={gridRef}
        viewportRef={viewportRef}
        scrollLeft={0}
      />,
    )
    unmount()
    expect(roState.captured!.instance.disconnectCalls).toBeGreaterThanOrEqual(1)
  })
})

// ===========================================================================
// 6. pointer 拖动：onScrollLeftChange 被以正确值调用 + body.classList
// ===========================================================================

describe('StickyScrollBar pointer drag (viewport branch)', () => {
  beforeEach(() => {
    installResizeObserverMock()
  })

  function setupDrag(opts: { startScrollLeft?: number } = {}) {
    const onScrollLeftChange = vi.fn()
    const grid = makeElement({ clientWidth: 1000, scrollWidth: 2000 })
    const viewport = makeElement({ clientWidth: 500 })
    const gridRef = { current: grid }
    const viewportRef = { current: viewport }

    render(
      <StickyScrollBar
        offsetScroll={0}
        gridRef={gridRef}
        viewportRef={viewportRef}
        scrollLeft={opts.startScrollLeft ?? 0}
        onScrollLeftChange={onScrollLeftChange}
      />,
    )
    const bar = document.querySelector('.dg-sticky-scroll-bar') as HTMLElement
    const thumb = bar.querySelector('.dg-sticky-scroll-bar-thumb') as HTMLElement
    // bar.clientWidth 必须有值，否则 onThumbPointerDown 早返回（barWidth=0
    // → thumbWidth=20 → thumbMaxLeft=-20 → max(0,-20)=0 → maxScroll=1500 OK，
    // 但 geometry.thumbMaxLeft=0 时拖动 multiplier=0，看不出 dx 效果）。
    Object.defineProperty(bar, 'clientWidth', { configurable: true, value: 800 })

    return { thumb, bar, onScrollLeftChange }
  }

  function firePointer(
    target: HTMLElement | Window,
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    init: { pointerId?: number; clientX?: number },
  ): void {
    const event = makePointerEvent(type, init)
    if (target === window) {
      window.dispatchEvent(event)
    } else {
      target.dispatchEvent(event)
    }
  }

  it('adds dragging classes on pointerdown and removes on pointerup', () => {
    const { thumb, bar } = setupDrag()

    firePointer(thumb, 'pointerdown', { pointerId: 1, clientX: 100 })
    expect(bar.classList.contains('dg-sticky-scroll-bar-dragging')).toBe(true)
    expect(document.body.classList.contains('dg-scrollbar-pointer-capturing')).toBe(true)

    firePointer(window, 'pointerup', { pointerId: 1, clientX: 100 })
    expect(bar.classList.contains('dg-sticky-scroll-bar-dragging')).toBe(false)
    expect(document.body.classList.contains('dg-scrollbar-pointer-capturing')).toBe(false)
  })

  it('translates pointer dx into scroll delta via onScrollLeftChange', () => {
    // barWidth=800, thumbWidth=max(20, 800*500/2000)=200, thumbMaxLeft=600,
    // maxScroll=1500。dx=300 → scrollDelta=300/600*1500=750 → next=0+750=750。
    const { thumb, onScrollLeftChange } = setupDrag({ startScrollLeft: 0 })

    firePointer(thumb, 'pointerdown', { pointerId: 1, clientX: 100 })
    firePointer(window, 'pointermove', { pointerId: 1, clientX: 400 }) // dx=300

    expect(onScrollLeftChange).toHaveBeenCalledWith(750)
  })

  it('clamps the resulting scrollLeft to [0, maxScroll]', () => {
    // 同上几何：maxScroll=1500。dx 极大 → next 被钳到 1500。
    const { thumb, onScrollLeftChange } = setupDrag({ startScrollLeft: 0 })

    firePointer(thumb, 'pointerdown', { pointerId: 1, clientX: 0 })
    firePointer(window, 'pointermove', { pointerId: 1, clientX: 10000 })

    expect(onScrollLeftChange).toHaveBeenCalledWith(1500)
  })

  it('does not start drag when maxScroll <= 1 (no-op pointerdown)', () => {
    const onScrollLeftChange = vi.fn()
    const grid = makeElement({ clientWidth: 1000, scrollWidth: 1000 }) // maxScroll=0
    const viewport = makeElement({ clientWidth: 1000 })
    render(
      <StickyScrollBar
        offsetScroll={0}
        gridRef={{ current: grid }}
        viewportRef={{ current: viewport }}
        scrollLeft={0}
        onScrollLeftChange={onScrollLeftChange}
      />,
    )
    const thumb = document.querySelector('.dg-sticky-scroll-bar-thumb') as HTMLElement
    firePointer(thumb, 'pointerdown', { pointerId: 1, clientX: 100 })
    firePointer(window, 'pointermove', { pointerId: 1, clientX: 9999 })

    expect(onScrollLeftChange).not.toHaveBeenCalled()
    expect(document.body.classList.contains('dg-scrollbar-pointer-capturing')).toBe(false)
  })

  it('ignores pointermove with mismatched pointerId', () => {
    const { thumb, onScrollLeftChange } = setupDrag({ startScrollLeft: 0 })

    firePointer(thumb, 'pointerdown', { pointerId: 1, clientX: 100 })
    firePointer(window, 'pointermove', { pointerId: 999, clientX: 9999 })

    expect(onScrollLeftChange).not.toHaveBeenCalled()
    // pointerup with wrong id 也不清理 dragging
    firePointer(window, 'pointerup', { pointerId: 999, clientX: 0 })
    // 这里仍 dragging（只有匹配 id 才会清）—— 用以证明 pointerId 过滤生效。
    // 实际后续测试例的 afterEach 会清掉 body.classList。
  })

  it('jumps one page right when clicking the sticky track after the thumb', () => {
    const { bar, thumb, onScrollLeftChange } = setupDrag({ startScrollLeft: 500 })
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: 100, width: 200 }),
    )

    firePointer(bar, 'pointerdown', { pointerId: 2, clientX: 350 })

    // viewport.clientWidth=500，所以轨道右侧点击滚动一页：500 + 500 = 1000。
    expect(onScrollLeftChange).toHaveBeenCalledWith(1000)
    expect(bar.classList.contains('dg-sticky-scroll-bar-dragging')).toBe(false)
    expect(document.body.classList.contains('dg-scrollbar-pointer-capturing')).toBe(false)
  })

  it('jumps one page left and clamps when clicking the sticky track before the thumb', () => {
    const { bar, thumb, onScrollLeftChange } = setupDrag({ startScrollLeft: 300 })
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: 100, width: 200 }),
    )

    firePointer(bar, 'pointerdown', { pointerId: 3, clientX: 50 })

    // 300 - viewportWidth(500) clamp 到 0。
    expect(onScrollLeftChange).toHaveBeenCalledWith(0)
    expect(bar.classList.contains('dg-sticky-scroll-bar-dragging')).toBe(false)
  })

  describe('track hold repeat', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('repeats page jumps while holding the sticky track after the thumb', () => {
      const { bar, thumb, onScrollLeftChange } = setupDrag({ startScrollLeft: 0 })
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ left: 100, width: 32 }),
      )

      firePointer(bar, 'pointerdown', { pointerId: 4, clientX: 200 })
      expect(onScrollLeftChange).toHaveBeenLastCalledWith(500)

      act(() => {
        vi.advanceTimersByTime(499)
      })
      expect(onScrollLeftChange).toHaveBeenCalledTimes(1)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(onScrollLeftChange).toHaveBeenLastCalledWith(1000)

      act(() => {
        vi.advanceTimersByTime(50)
      })
      expect(onScrollLeftChange).toHaveBeenLastCalledWith(1500)

      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(onScrollLeftChange).toHaveBeenCalledTimes(3)
    })
  })
})

// ===========================================================================
// 7. unmount 清理副作用（bar.classList + body.classList）
// ===========================================================================

describe('StickyScrollBar unmount cleanup', () => {
  beforeEach(() => {
    installResizeObserverMock()
  })

  it('removes dragging classes on unmount', () => {
    const grid = makeElement({ clientWidth: 1000, scrollWidth: 2000 })
    const viewport = makeElement({ clientWidth: 500 })

    const { unmount } = render(
      <StickyScrollBar
        offsetScroll={0}
        gridRef={{ current: grid }}
        viewportRef={{ current: viewport }}
        scrollLeft={0}
      />,
    )

    // 模拟拖动半途（unmount 前类已加）
    document.body.classList.add('dg-scrollbar-pointer-capturing')
    unmount()
    expect(document.body.classList.contains('dg-scrollbar-pointer-capturing')).toBe(false)
  })
})

// ===========================================================================
// 8. window/HTMLElement 同步分支（无 viewportRef）：拖动直接改 container.scrollLeft
// ===========================================================================

describe('StickyScrollBar non-viewport branch (HTMLElement container)', () => {
  beforeEach(() => {
    installResizeObserverMock()
  })

  it('drives container.scrollLeft directly when no viewportRef is provided', () => {
    const container = makeElement({
      clientWidth: 500,
      scrollWidth: 2000,
      scrollLeft: 0,
    })
    // 把 container 作为 getContainer 返回值
    const gridRef = { current: null }
    render(
      <StickyScrollBar
        offsetScroll={0}
        getContainer={() => container}
        gridRef={gridRef}
      />,
    )
    const thumb = document.querySelector('.dg-sticky-scroll-bar-thumb') as HTMLElement
    const bar = document.querySelector('.dg-sticky-scroll-bar') as HTMLElement
    Object.defineProperty(bar, 'clientWidth', { configurable: true, value: 800 })

    // 派发 pointerdown → pointermove。container.scrollWidth=2000，clientWidth=500，
    // barWidth=800，thumbWidth=200，thumbMaxLeft=600，maxScroll=1500。
    // dx=300 → scrollDelta=750。
    thumb.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 1, clientX: 100 }))
    window.dispatchEvent(makePointerEvent('pointermove', { pointerId: 1, clientX: 400 }))

    expect(container.scrollLeft).toBe(750)
  })

  it('uses window scroll/innerWidth when getContainer returns window', () => {
    // vitest 的 jsdom 里 `window instanceof Window` 为 false（Window 构造器不是
    // window 的 prototype chain），组件用 instanceof 判定 window 分支。这里强行让
    // 它成立：覆盖 Window[Symbol.hasInstance] 让 `window instanceof Window` 为真。
    // 注意：真实浏览器里 instanceof Window 自然成立，本 stub 只为复现组件行为。
    const originalHasInstance = (Window as unknown as { [Symbol.hasInstance]?: unknown })[
      Symbol.hasInstance
    ]
    Object.defineProperty(Window, Symbol.hasInstance, {
      configurable: true,
      value: (v: unknown) => v === window,
    })
    // 改写 window.scrollX / innerWidth / document.documentElement.scrollWidth。
    // 注意：jsdom 的 scrollX 是只读，需要 stub。
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 0, writable: true })
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500, writable: true })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true })
    Object.defineProperty(document.documentElement, 'scrollWidth', {
      configurable: true,
      value: 2000,
      writable: true,
    })
    const scrollToSpy = vi.fn()
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      writable: true,
      value: scrollToSpy,
    })

    try {
      render(
        <StickyScrollBar
          offsetScroll={0}
          getContainer={() => window}
          gridRef={{ current: null }}
        />,
      )
      const thumb = document.querySelector('.dg-sticky-scroll-bar-thumb') as HTMLElement
      const bar = document.querySelector('.dg-sticky-scroll-bar') as HTMLElement
      Object.defineProperty(bar, 'clientWidth', { configurable: true, value: 800 })

      // 派发拖动。barWidth=800，thumbWidth=200，thumbMaxLeft=600，maxScroll=1500。
      // dx=300 → next=750。
      thumb.dispatchEvent(makePointerEvent('pointerdown', { pointerId: 1, clientX: 100 }))
      window.dispatchEvent(makePointerEvent('pointermove', { pointerId: 1, clientX: 400 }))

      expect(scrollToSpy).toHaveBeenCalled()
      const [x, y] = scrollToSpy.mock.calls[0] as [number, number]
      expect(x).toBe(750)
      // y 用了当前的 scrollY（0）。
      expect(y).toBe(0)
    } finally {
      // 还原 hasInstance，避免污染后续测试。
      Object.defineProperty(Window, Symbol.hasInstance, {
        configurable: true,
        value: originalHasInstance,
      })
    }
  })
})
