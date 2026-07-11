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
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 100 })
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 300 })
    Object.defineProperty(container, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    })

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
})
