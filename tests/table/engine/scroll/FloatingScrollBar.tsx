import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FloatingScrollBar } from '../../../../src/table/engine/FloatingScrollBar'

type ROCallback = (entries: Array<ResizeObserverEntry>) => void

class CapturingResizeObserver {
  static callbacks: Array<ROCallback> = []
  callback: ROCallback

  constructor(callback: ROCallback) {
    this.callback = callback
    CapturingResizeObserver.callbacks.push(callback)
  }

  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

function pointer(type: string, init: { pointerId?: number; clientX?: number; clientY?: number }): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: init.pointerId ?? 1,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
  })
}

function setScrollMetrics(
  container: HTMLElement,
  metrics: {
    clientHeight?: number
    scrollHeight?: number
    scrollTop?: number
    clientWidth?: number
    scrollWidth?: number
    scrollLeft?: number
  },
): void {
  if (metrics.clientHeight !== undefined) {
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: metrics.clientHeight,
    })
  }
  if (metrics.scrollHeight !== undefined) {
    Object.defineProperty(container, 'scrollHeight', {
      configurable: true,
      value: metrics.scrollHeight,
    })
  }
  if (metrics.scrollTop !== undefined) {
    Object.defineProperty(container, 'scrollTop', {
      configurable: true,
      value: metrics.scrollTop,
      writable: true,
    })
  }
  if (metrics.clientWidth !== undefined) {
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: metrics.clientWidth,
    })
  }
  if (metrics.scrollWidth !== undefined) {
    Object.defineProperty(container, 'scrollWidth', {
      configurable: true,
      value: metrics.scrollWidth,
    })
  }
  if (metrics.scrollLeft !== undefined) {
    Object.defineProperty(container, 'scrollLeft', {
      configurable: true,
      value: metrics.scrollLeft,
      writable: true,
    })
  }
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

function extractTranslatePx(transform: string): number {
  const match = transform.match(/translate[XY]\(([-\d.]+)px\)/)
  return match ? Number(match[1]) : Number.NaN
}

afterEach(() => {
  CapturingResizeObserver.callbacks = []
  vi.restoreAllMocks()
  document.body.classList.remove('dg-scrollbar-pointer-capturing')
})

describe('FloatingScrollBar', () => {
  it('maps vertical thumb dragging back to container scrollTop', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar scrollContainerClassName="dg-scroll">
        <div className="dg-grid" data-testid="grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, { clientHeight: 100, scrollHeight: 300, scrollTop: 0 })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    // jsdom 不计算 transform 的实际屏幕坐标，getBoundingClientRect 默认全 0；显式 mock
    // 让 clientY=10 落在 thumb [0, 33.33] 内 → 命中 thumb → 进入增量拖动（而非按页跳）。
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 0, height: 33.33333333333333 }),
    )

    expect(thumb.style.display).toBe('block')
    expect(thumb.style.height).toBe('33.33333333333333px')

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 7, clientY: 10 }))
    })
    expect(document.body).toHaveClass('dg-scrollbar-pointer-capturing')

    act(() => {
      window.dispatchEvent(pointer('pointermove', { pointerId: 7, clientY: 20 }))
    })
    expect(container.scrollTop).toBeCloseTo(30, 3)

    act(() => {
      window.dispatchEvent(pointer('pointerup', { pointerId: 7, clientY: 20 }))
    })
    expect(document.body).not.toHaveClass('dg-scrollbar-pointer-capturing')
    expect(hit.releasePointerCapture).toHaveBeenCalledWith(7)

    expect(screen.getByTestId('grid')).toBeInTheDocument()
  })

  it('maps horizontal thumb dragging back to container scrollLeft', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, {
      clientHeight: 100,
      scrollHeight: 100,
      scrollTop: 0,
      clientWidth: 100,
      scrollWidth: 300,
      scrollLeft: 0,
    })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-h')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    // 同纵向：mock thumb 屏幕坐标 [0, 33.33]，让 clientX=10 命中 thumb → 进入增量拖动。
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: 0, width: 33.33333333333333 }),
    )

    expect(thumb.style.display).toBe('block')
    expect(thumb.style.width).toBe('33.33333333333333px')

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 8, clientX: 10 }))
      window.dispatchEvent(pointer('pointermove', { pointerId: 8, clientX: 20 }))
    })

    expect(container.scrollLeft).toBeCloseTo(30, 3)

    act(() => {
      window.dispatchEvent(pointer('pointerup', { pointerId: 8, clientX: 20 }))
    })

    expect(document.body).not.toHaveClass('dg-scrollbar-pointer-capturing')
    expect(hit.releasePointerCapture).toHaveBeenCalledWith(8)
  })

  it('syncs visible thumbs on scroll events through requestAnimationFrame', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)
    const rafCallbacks: FrameRequestCallback[] = []
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

    render(
      <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, {
      clientHeight: 100,
      scrollHeight: 300,
      scrollTop: 0,
      clientWidth: 100,
      scrollWidth: 300,
      scrollLeft: 0,
    })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const vThumb = document.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
    const hThumb = document.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')!

    act(() => {
      container.scrollTop = 100
      container.scrollLeft = 50
      container.dispatchEvent(new Event('scroll'))
      container.dispatchEvent(new Event('scroll'))
    })

    expect(rafCallbacks).toHaveLength(1)

    act(() => {
      rafCallbacks.shift()!(0)
    })

    expect(extractTranslatePx(vThumb.style.transform)).toBeCloseTo(33.33, 2)
    expect(extractTranslatePx(hThumb.style.transform)).toBeCloseTo(16.67, 2)
  })

  it('keeps thumbs hidden when content does not overflow', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, {
      clientHeight: 100,
      scrollHeight: 100,
      clientWidth: 100,
      scrollWidth: 100,
    })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    expect(document.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')?.style.display).toBe(
      'none',
    )
    expect(
      document.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')?.style.display,
    ).toBe('none')
  })

  it('positions tracks below sticky headers and above sticky summaries', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if ((element as HTMLElement).classList.contains('dg-cell-summary')) {
        return { position: 'sticky', bottom: '0px' } as CSSStyleDeclaration
      }
      return { position: 'static', bottom: 'auto' } as CSSStyleDeclaration
    })

    render(
      <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
        <div className="dg-grid">
          <div className="dg-cell-header" data-testid="header" />
          <div className="dg-cell-summary" data-testid="summary" />
        </div>
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, {
      clientHeight: 120,
      scrollHeight: 360,
      clientWidth: 100,
      scrollWidth: 300,
    })
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(domRect({ top: 10, height: 120 }))
    vi.spyOn(screen.getByTestId('header'), 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 10, bottom: 50, height: 40 }),
    )
    vi.spyOn(screen.getByTestId('summary'), 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 100, bottom: 120, height: 20 }),
    )

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const vHit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
    const hHit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-h')!

    expect(vHit.style.top).toBe('40px')
    expect(vHit.style.bottom).toBe('20px')
    expect(hHit.style.bottom).toBe('20px')
  })

  it('forwards scroll refs, class names, styles, and scroll container props', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)
    const externalRef = { current: null as HTMLDivElement | null }

    render(
      <FloatingScrollBar
        scrollContainerClassName="dg-scroll custom-scroll"
        scrollContainerProps={{ 'data-testid': 'scroll-container' }}
        scrollContainerRef={externalRef}
        scrollContainerStyle={{ maxHeight: 100 }}
        wrapClassName="semantic-section"
        wrapStyle={{ minHeight: 40 }}
      >
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const wrap = document.querySelector<HTMLElement>('.dg-scroll-wrap')!
    const container = screen.getByTestId('scroll-container') as HTMLDivElement

    expect(externalRef.current).toBe(container)
    expect(wrap).toHaveClass('semantic-section')
    expect(wrap).toHaveStyle({ minHeight: '40px' })
    expect(container).toHaveClass('dg-scroll')
    expect(container).toHaveClass('custom-scroll')
    expect(container).toHaveStyle({ maxHeight: '100px' })
  })

  it('jumps one page up when clicking the vertical track above the thumb', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    // clientHeight=200, scrollHeight=600 → maxScroll=400；viewportSize=200（无表头/summary）。
    setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 200 })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    // thumb 屏幕坐标 [100, 132]；clientY=50 落在 thumb 上方轨道空白 → zone='before'。
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 100, height: 32 }),
    )

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 21, clientY: 50 }))
    })

    // 跳转：200 - 200 = 0。
    expect(container.scrollTop).toBe(0)
    // 不进入拖动：未捕获 pointer、未加 capturing class。
    expect(hit.setPointerCapture).not.toHaveBeenCalled()
    expect(document.body).not.toHaveClass('dg-scrollbar-pointer-capturing')
    expect(hit).not.toHaveClass('dg-floating-scrollbar-dragging')
  })

  it('jumps one page down when clicking the vertical track below the thumb', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 200 })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    // thumb [100, 132]；clientY=180 落在下方轨道空白 → zone='after'。
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 100, height: 32 }),
    )

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 22, clientY: 180 }))
    })

    // 跳转：200 + 200 = 400。
    expect(container.scrollTop).toBe(400)
    expect(hit.setPointerCapture).not.toHaveBeenCalled()
    expect(document.body).not.toHaveClass('dg-scrollbar-pointer-capturing')
  })

  it('clamps the vertical page jump to maxScroll when near the end', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 350 })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 100, height: 32 }),
    )

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 23, clientY: 250 }))
    })

    // maxScroll=400；350 + 200 = 550 clamp 到 400。
    expect(container.scrollTop).toBe(400)
  })

  it('clamps the vertical page jump to 0 when near the start', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 100 })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 100, height: 32 }),
    )

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 24, clientY: 0 }))
    })

    // 100 - 200 = -100 clamp 到 0。
    expect(container.scrollTop).toBe(0)
  })

  it('jumps one page left when clicking the horizontal track before the thumb', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, {
      clientHeight: 100,
      scrollHeight: 100,
      clientWidth: 200,
      scrollWidth: 600,
      scrollLeft: 200,
    })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-h')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: 100, width: 32 }),
    )

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 25, clientX: 50 }))
    })

    expect(container.scrollLeft).toBe(0)
    expect(hit.setPointerCapture).not.toHaveBeenCalled()
  })

  it('jumps one page right when clicking the horizontal track after the thumb', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, {
      clientHeight: 100,
      scrollHeight: 100,
      clientWidth: 200,
      scrollWidth: 600,
      scrollLeft: 200,
    })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-h')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ left: 100, width: 32 }),
    )

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 26, clientX: 250 }))
    })

    // 200 + 200 = 400。
    expect(container.scrollLeft).toBe(400)
    expect(hit.setPointerCapture).not.toHaveBeenCalled()
    expect(document.body).not.toHaveClass('dg-scrollbar-pointer-capturing')
  })

  it('still enters drag mode when clicking on the thumb body (no page jump)', () => {
    vi.stubGlobal('ResizeObserver', CapturingResizeObserver)

    render(
      <FloatingScrollBar scrollContainerClassName="dg-scroll">
        <div className="dg-grid" />
      </FloatingScrollBar>,
    )

    const container = document.querySelector<HTMLElement>('.dg-scroll')!
    setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 200 })

    act(() => {
      CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
    })

    const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
    const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
    hit.setPointerCapture = vi.fn()
    hit.releasePointerCapture = vi.fn()
    // thumb [100, 132]；clientY=110 命中 thumb → 进入增量拖动（不跳页）。
    vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
      domRect({ top: 100, height: 32 }),
    )

    act(() => {
      hit.dispatchEvent(pointer('pointerdown', { pointerId: 27, clientY: 110 }))
    })

    // 进入拖动：scrollTop 未变（200），但已 setPointerCapture + 加 capturing class。
    expect(container.scrollTop).toBe(200)
    expect(hit.setPointerCapture).toHaveBeenCalledWith(27)
    expect(document.body).toHaveClass('dg-scrollbar-pointer-capturing')

    // 拖动一帧 dy=20 → scrollTop += 20 / thumbMaxOffset * maxScroll。
    act(() => {
      window.dispatchEvent(pointer('pointermove', { pointerId: 27, clientY: 130 }))
    })
    // thumbSize=200/600*200=66.67；thumbMaxOffset=200-66.67=133.33；maxScroll=400。
    // dy=20 → delta scroll = 20/133.33*400 = 60。
    expect(container.scrollTop).toBeCloseTo(260, 3)

    act(() => {
      window.dispatchEvent(pointer('pointerup', { pointerId: 27, clientY: 130 }))
    })
    expect(hit.releasePointerCapture).toHaveBeenCalledWith(27)
    expect(document.body).not.toHaveClass('dg-scrollbar-pointer-capturing')
  })

  describe('Windows repeat button (track hold)', () => {
    beforeEach(() => {
      vi.stubGlobal('ResizeObserver', CapturingResizeObserver)
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('repeats vertical page jumps while holding the track below the thumb', () => {
      render(
        <FloatingScrollBar scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      // clientHeight=200, scrollHeight=600 → maxScroll=400；viewportSize=200。
      // 起点 scrollTop=0；下方轨道点击预期跳页序列：0 → 200 → 400 → 400 (stop).
      setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 0 })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      // thumb [100, 132]；clientY=180 落在下方轨道空白 → zone='after'。整个 repeat 期间 thumb rect
      // mock 保持 [100, 132]（jsdom 不会真移 thumb），computeTrackJump 始终判 zone='after'，
      // nextScroll 由 currentScroll+200 推进 → 边界 clamp 到 400 后 next===current 触发 stop。
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ top: 100, height: 32 }),
      )

      // pointerdown：立即首跳一页（0 → 200）。
      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 30, clientY: 180 }))
      })
      expect(container.scrollTop).toBe(200)

      // 按住 < 500ms：不应触发任何额外跳。
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(container.scrollTop).toBe(200)

      // 推进到 500ms（首 repeat tick）：再跳一页（200 → 400）。
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(container.scrollTop).toBe(400)

      // 推进到 550ms（setInterval 首 tick）：currentScroll=400=maxScroll → next clamp 仍 400 → stop。
      // 在 stop 触发前挂 spy，验证 stop 真的清了 interval（防泄漏回归）。
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      act(() => {
        vi.advanceTimersByTime(50)
      })
      expect(container.scrollTop).toBe(400)
      expect(clearIntervalSpy).toHaveBeenCalled()

      // 继续推进：repeat 已停，scrollTop 不再变。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollTop).toBe(400)

      // 已 stop → 监听已移除；再 pointerup 应是 no-op（不影响 scrollTop，不抛错）。
      act(() => {
        window.dispatchEvent(pointer('pointerup', { pointerId: 30, clientY: 180 }))
      })
      expect(container.scrollTop).toBe(400)
    })

    it('stops repeating on pointerup before reaching the boundary', () => {
      render(
        <FloatingScrollBar scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      // clientHeight=100, scrollHeight=2000 → maxScroll=1900；viewportSize=100；足够多跳几次不停。
      setScrollMetrics(container, { clientHeight: 100, scrollHeight: 2000, scrollTop: 0 })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ top: 0, height: 32 }),
      )

      // pointerdown：0 → 100。
      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 31, clientY: 50 }))
      })
      expect(container.scrollTop).toBe(100)

      // 推进 500ms → 首 repeat tick：100 → 200。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollTop).toBe(200)

      // 再推进 100ms → setInterval 触发 2 次（50ms + 100ms）：200 → 300 → 400。
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(container.scrollTop).toBe(400)

      // pointerup：立即停。
      act(() => {
        window.dispatchEvent(pointer('pointerup', { pointerId: 31, clientY: 50 }))
      })

      // 继续推进 1s：不应再跳。
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(container.scrollTop).toBe(400)
    })

    it('stops repeating when pointer moves onto the thumb during hold', () => {
      render(
        <FloatingScrollBar scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      setScrollMetrics(container, { clientHeight: 100, scrollHeight: 2000, scrollTop: 0 })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ top: 100, height: 32 }),
      )

      // pointerdown clientY=200（在 thumb [100,132] 下方）→ zone='after' → 0 → 100。
      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 32, clientY: 200 }))
      })
      expect(container.scrollTop).toBe(100)

      // 推进 500ms → 首 repeat tick：100 → 200。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollTop).toBe(200)

      // 模拟 pointer 移到 thumb 上（clientY=110 落在 [100, 132] 内）→ 停止条件 3。
      act(() => {
        window.dispatchEvent(pointer('pointermove', { pointerId: 32, clientY: 110 }))
      })

      // 继续推进：不应再跳。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollTop).toBe(200)
    })

    it('does not start repeat when first jump already hits the boundary', () => {
      render(
        <FloatingScrollBar scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      // scrollTop 已在 maxScroll：computeTrackJump next === current → 不启动 repeat。
      setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 400 })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ top: 100, height: 32 }),
      )

      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 33, clientY: 180 }))
      })
      // next=clamp(400+200)=400 === current → 赋值后不变；首跳无空间 → 不启动 repeat。
      expect(container.scrollTop).toBe(400)

      // 推进 1s：repeat 没启动，scrollTop 不变。
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(container.scrollTop).toBe(400)
    })

    it('does not start repeat when clicking on the thumb body (still enters drag)', () => {
      render(
        <FloatingScrollBar scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      setScrollMetrics(container, { clientHeight: 200, scrollHeight: 600, scrollTop: 200 })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      // thumb [100, 132]；clientY=110 命中 thumb → zone='thumb' → 拖动路径，不触发 repeat。
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ top: 100, height: 32 }),
      )

      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 34, clientY: 110 }))
      })

      expect(container.scrollTop).toBe(200)
      expect(hit.setPointerCapture).toHaveBeenCalledWith(34)

      // 推进 1s：thumb 命中不应启动 repeat，scrollTop 不变。
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(container.scrollTop).toBe(200)

      // 释放 pointer 清理。
      act(() => {
        window.dispatchEvent(pointer('pointerup', { pointerId: 34, clientY: 110 }))
      })
    })

    it('repeats horizontal page jumps while holding the track after the thumb', () => {
      render(
        <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      setScrollMetrics(container, {
        clientHeight: 100,
        scrollHeight: 100,
        clientWidth: 200,
        scrollWidth: 600,
        scrollLeft: 0,
      })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-h')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ left: 100, width: 32 }),
      )

      // pointerdown clientX=250 在 thumb [100,132] 右侧 → zone='after' → 0 → 200。
      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 35, clientX: 250 }))
      })
      expect(container.scrollLeft).toBe(200)

      // 推进 500ms → 首 repeat tick：200 → 400。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollLeft).toBe(400)

      // pointerup：停止。
      act(() => {
        window.dispatchEvent(pointer('pointerup', { pointerId: 35, clientX: 250 }))
      })

      // 推进 1s：不应再跳。
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(container.scrollLeft).toBe(400)
    })

    it('stops horizontal repeat at maxScroll boundary', () => {
      render(
        <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      // clientWidth=200, scrollWidth=600 → maxScroll=400；viewportSize=200。
      // 起点 0；连续跳：0 → 200 → 400 → 400 (stop)。
      setScrollMetrics(container, {
        clientHeight: 100,
        scrollHeight: 100,
        clientWidth: 200,
        scrollWidth: 600,
        scrollLeft: 0,
      })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-h')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ left: 100, width: 32 }),
      )

      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 37, clientX: 250 }))
      })
      expect(container.scrollLeft).toBe(200)

      // 500ms：首 repeat tick → 400（=maxScroll）。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollLeft).toBe(400)

      // 550ms：setInterval 首 tick → next clamp 仍 400 → stop。
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
      act(() => {
        vi.advanceTimersByTime(50)
      })
      expect(container.scrollLeft).toBe(400)
      expect(clearIntervalSpy).toHaveBeenCalled()

      // repeat 已停。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollLeft).toBe(400)
    })

    it('stops horizontal repeat when pointer moves onto the thumb', () => {
      render(
        <FloatingScrollBar horizontal scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      setScrollMetrics(container, {
        clientHeight: 100,
        scrollHeight: 100,
        clientWidth: 100,
        scrollWidth: 2000,
        scrollLeft: 0,
      })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-h')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb-h')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ left: 100, width: 32 }),
      )

      // pointerdown clientX=200 在 thumb [100,132] 右侧 → zone='after' → 0 → 100。
      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 38, clientX: 200 }))
      })
      expect(container.scrollLeft).toBe(100)

      // 500ms：首 repeat tick → 200。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollLeft).toBe(200)

      // pointer 移到 thumb 上（clientX=110 落在 [100, 132] 内）→ 停止条件 3。
      act(() => {
        window.dispatchEvent(pointer('pointermove', { pointerId: 38, clientX: 110 }))
      })

      // 继续推进：不应再跳。
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(container.scrollLeft).toBe(200)
    })

    it('clears repeat timers on unmount (no leak)', () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

      const { unmount } = render(
        <FloatingScrollBar scrollContainerClassName="dg-scroll">
          <div className="dg-grid" />
        </FloatingScrollBar>,
      )

      const container = document.querySelector<HTMLElement>('.dg-scroll')!
      setScrollMetrics(container, { clientHeight: 100, scrollHeight: 2000, scrollTop: 0 })

      act(() => {
        CapturingResizeObserver.callbacks.forEach((callback) => callback([]))
      })

      const hit = document.querySelector<HTMLElement>('.dg-floating-scrollbar-v')!
      const thumb = hit.querySelector<HTMLElement>('.dg-floating-scrollbar-thumb')!
      hit.setPointerCapture = vi.fn()
      hit.releasePointerCapture = vi.fn()
      vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(
        domRect({ top: 0, height: 32 }),
      )

      act(() => {
        hit.dispatchEvent(pointer('pointerdown', { pointerId: 36, clientY: 50 }))
      })
      // repeat 定时器已挂；卸载应清。
      clearTimeoutSpy.mockClear()
      clearIntervalSpy.mockClear()
      unmount()
      expect(clearTimeoutSpy).toHaveBeenCalled()
      // repeat 启动时 setInterval 尚未挂（仅在 setTimeout 触发后挂）；卸载走 stop → clearTimeout 命中。
      // 不强断言 clearInterval（守卫条件分支可能未触达），只要 clearTimeout 被调即可证明 stop 被执行。
    })
  })
})
