import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useColumnResize,
  type ColumnResizeMode,
  type UseColumnResizeOptions,
} from '../../../../src/table/engine/useColumnResize'

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 1
    }
  }

  ;(window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
  ;(globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
}

type HarnessOptions = UseColumnResizeOptions & { enabled: boolean }

interface HarnessProps {
  options: HarnessOptions
  siblingKey?: string | null
  onSnapshot?: (snapshot: { widths: Map<string, number>; resizingKey: string | null }) => void
}

function TestHarness({ options, siblingKey = 'age', onSnapshot }: HarnessProps) {
  const resize = useColumnResize(options)
  onSnapshot?.({ widths: resize.resizedWidths, resizingKey: resize.resizingKey })

  return (
    <div className="dg-grid">
      <div className="dg-cell-header" data-column-key="name" data-testid="name-header">
        <div
          aria-label="resize-name"
          role="separator"
          onPointerDown={resize.onPointerDown('name', siblingKey ?? undefined)}
        />
      </div>
      <div className="dg-cell-header" data-column-key="age" data-testid="age-header" />
      <output data-testid="resizing-key">{resize.resizingKey ?? ''}</output>
      <output data-testid="name-width">{resize.resizedWidths.get('name') ?? ''}</output>
      <output data-testid="age-width">{resize.resizedWidths.get('age') ?? ''}</output>
    </div>
  )
}

function setWidth(element: Element, width: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 20,
    left: 0,
    right: width,
    top: 0,
    bottom: 20,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

function pointer(type: string, clientX: number, pointerId = 7): PointerEvent {
  return new PointerEvent(type, {
    pointerId,
    clientX,
    bubbles: true,
    cancelable: true,
    button: 0,
  })
}

function pointerDown(element: Element, clientX = 100, pointerId = 7, button = 0): void {
  fireEvent(element, new PointerEvent('pointerdown', {
    pointerId,
    clientX,
    bubbles: true,
    cancelable: true,
    button,
  }))
}

function renderHarness(options: Partial<HarnessOptions>, props: Partial<HarnessProps> = {}) {
  const result = render(
    <TestHarness
      options={{ enabled: true, mode: 'ResizeLeft', ...options }}
      {...props}
    />,
  )
  const resizer = screen.getByRole('separator', { name: 'resize-name' })
  const nameHeader = screen.getByTestId('name-header')
  const ageHeader = screen.getByTestId('age-header')
  setWidth(nameHeader, 100)
  setWidth(ageHeader, 120)
  return { ...result, resizer, nameHeader, ageHeader }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useColumnResize', () => {
  it('does not start resizing when disabled or mode is Disabled', () => {
    const onResize = vi.fn()

    const { resizer, rerender } = renderHarness({ enabled: false, onResize })
    const addListener = vi.spyOn(resizer, 'addEventListener')

    pointerDown(resizer, 10)
    expect(screen.getByTestId('resizing-key')).toHaveTextContent('')
    expect(onResize).not.toHaveBeenCalled()
    expect(addListener).not.toHaveBeenCalledWith('pointermove', expect.any(Function))

    rerender(<TestHarness options={{ enabled: true, mode: 'Disabled', onResize }} />)
    pointerDown(screen.getByRole('separator', { name: 'resize-name' }), 10)
    expect(screen.getByTestId('resizing-key')).toHaveTextContent('')
    expect(onResize).not.toHaveBeenCalled()
  })

  it('does not start ResizeSibling without a sibling key', () => {
    const onResize = vi.fn()
    const { resizer } = renderHarness(
      { mode: 'ResizeSibling', onResize },
      { siblingKey: null },
    )
    const addListener = vi.spyOn(resizer, 'addEventListener')

    pointerDown(resizer, 10)

    expect(screen.getByTestId('resizing-key')).toHaveTextContent('')
    expect(onResize).not.toHaveBeenCalled()
    expect(addListener).not.toHaveBeenCalledWith('pointermove', expect.any(Function))
  })

  it('freezes current columns in ResizeLeft and clamps the left column through min/max options', () => {
    const onResize = vi.fn()
    const onResizeEnd = vi.fn()
    const { resizer } = renderHarness({
      mode: 'ResizeLeft',
      minWidth: 80,
      maxWidth: 130,
      onResize,
      onResizeEnd,
    })

    act(() => {
      pointerDown(resizer, 100)
    })
    expect(screen.getByTestId('resizing-key')).toHaveTextContent('name')

    act(() => {
      resizer.dispatchEvent(pointer('pointermove', 200))
    })
    expect(screen.getByTestId('name-width')).toHaveTextContent('130')
    expect(screen.getByTestId('age-width')).toHaveTextContent('120')
    expect(onResize).toHaveBeenLastCalledWith({
      key: 'name',
      width: 130,
      siblingKey: 'age',
      siblingWidth: undefined,
    })

    act(() => {
      resizer.dispatchEvent(pointer('pointermove', 0))
    })
    expect(screen.getByTestId('name-width')).toHaveTextContent('80')
    expect(screen.getByTestId('age-width')).toHaveTextContent('120')
    expect(onResize).toHaveBeenLastCalledWith({
      key: 'name',
      width: 80,
      siblingKey: 'age',
      siblingWidth: undefined,
    })

    act(() => {
      resizer.dispatchEvent(pointer('pointerup', 0))
    })
    expect(onResizeEnd).toHaveBeenCalledWith({
      key: 'name',
      width: 80,
      siblingKey: 'age',
      siblingWidth: undefined,
    })
    expect(screen.getByTestId('resizing-key')).toHaveTextContent('')
  })

  it('updates sibling columns in ResizeSibling and clamps against both columns', () => {
    const onResize = vi.fn()
    const onResizeEnd = vi.fn()
    const { resizer } = renderHarness({
      mode: 'ResizeSibling',
      minWidth: (key) => (key === 'name' ? 60 : 70),
      maxWidth: (key) => (key === 'name' ? 180 : 150),
      onResize,
      onResizeEnd,
    })

    act(() => {
      pointerDown(resizer, 100)
      resizer.dispatchEvent(pointer('pointermove', 300))
    })

    expect(screen.getByTestId('name-width')).toHaveTextContent('150')
    expect(screen.getByTestId('age-width')).toHaveTextContent('70')
    expect(onResize).toHaveBeenLastCalledWith({
      key: 'name',
      width: 150,
      siblingKey: 'age',
      siblingWidth: 70,
    })

    act(() => {
      resizer.dispatchEvent(pointer('pointermove', -100))
    })
    expect(screen.getByTestId('name-width')).toHaveTextContent('70')
    expect(screen.getByTestId('age-width')).toHaveTextContent('150')

    act(() => {
      resizer.dispatchEvent(pointer('pointerup', -100))
    })
    expect(onResizeEnd).toHaveBeenCalledWith({
      key: 'name',
      width: 70,
      siblingKey: 'age',
      siblingWidth: 150,
    })
  })

  it('ignores non-primary pointer buttons', () => {
    const onResize = vi.fn()
    const { resizer } = renderHarness({ onResize })
    const addListener = vi.spyOn(resizer, 'addEventListener')

    pointerDown(resizer, 100, 7, 2)

    expect(screen.getByTestId('resizing-key')).toHaveTextContent('')
    expect(onResize).not.toHaveBeenCalled()
    expect(addListener).not.toHaveBeenCalledWith('pointermove', expect.any(Function))
  })

  it('sets capture on pointerdown and removes native listeners on pointerup', () => {
    const { resizer } = renderHarness({ mode: 'ResizeLeft' })
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    Object.assign(resizer, { setPointerCapture, releasePointerCapture })
    const addListener = vi.spyOn(resizer, 'addEventListener')
    const removeListener = vi.spyOn(resizer, 'removeEventListener')

    act(() => {
      pointerDown(resizer, 100)
    })
    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(addListener).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(addListener).toHaveBeenCalledWith('pointerup', expect.any(Function))
    expect(addListener).toHaveBeenCalledWith('pointercancel', expect.any(Function))

    act(() => {
      resizer.dispatchEvent(pointer('pointerup', 100))
    })

    expect(releasePointerCapture).toHaveBeenCalledWith(7)
    expect(removeListener).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(removeListener).toHaveBeenCalledWith('pointerup', expect.any(Function))
    expect(removeListener).toHaveBeenCalledWith('pointercancel', expect.any(Function))
    expect(screen.getByTestId('resizing-key')).toHaveTextContent('')
  })

  it('removes native listeners if unmounted during an active drag', () => {
    const { resizer, unmount } = renderHarness({ mode: 'ResizeLeft' })
    const removeListener = vi.spyOn(resizer, 'removeEventListener')

    act(() => {
      pointerDown(resizer, 100)
    })

    unmount()

    expect(removeListener).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(removeListener).toHaveBeenCalledWith('pointerup', expect.any(Function))
    expect(removeListener).toHaveBeenCalledWith('pointercancel', expect.any(Function))
  })

  it.each<ColumnResizeMode>(['ResizeLeft', 'ResizeSibling'])(
    'ignores pointer events from a different pointerId in %s',
    (mode) => {
      const onResize = vi.fn()
      const { resizer } = renderHarness({ mode, onResize })

      act(() => {
        pointerDown(resizer, 100)
        resizer.dispatchEvent(pointer('pointermove', 160, 8))
        resizer.dispatchEvent(pointer('pointerup', 160, 8))
      })

      expect(onResize).not.toHaveBeenCalled()
      expect(screen.getByTestId('resizing-key')).toHaveTextContent('name')
    },
  )
})
