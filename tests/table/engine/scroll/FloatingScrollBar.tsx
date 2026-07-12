import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
})
