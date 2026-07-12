import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useRowDragSort,
  type UseRowDragSortOptions,
} from '../../../../src/table/engine/useRowDragSort'

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 1
    }
  }

  ;(window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent =
    PointerEventPolyfill
  ;(globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent =
    PointerEventPolyfill
}

interface RowRecord {
  key: string
  label: string
}

type HarnessOptions = Omit<
  UseRowDragSortOptions<RowRecord>,
  'containerRef' | 'dataSource' | 'rowKey' | 'onSort'
>

interface HarnessProps {
  dataSource: RowRecord[]
  onSort: (next: RowRecord[]) => void
  options?: HarnessOptions
}

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

function TestHarness({ dataSource, onSort, options }: HarnessProps) {
  const containerRef = (globalThis as unknown as {
    __rowDragContainerRef?: React.RefObject<HTMLDivElement | null>
  }).__rowDragContainerRef!
  const drag = useRowDragSort({
    dataSource,
    rowKey: 'key',
    onSort,
    containerRef,
    autoScroll: false,
    ...options,
  })

  return (
    <div
      data-testid="row-container"
      ref={containerRef}
      {...drag.containerProps}
    >
      <div className="dg-wrapper">
        {dataSource.map((record, index) => (
          <div
            data-row-index={index}
            data-testid={`row-${index}`}
            key={record.key}
          >
            <button className="drag-handle" data-testid={`handle-${index}`} type="button">
              {record.label}
            </button>
          </div>
        ))}
      </div>
      <output data-testid="drag-state">
        {drag.dragState ? `${drag.dragState.fromIndex}:${drag.dragState.overIndex}` : ''}
      </output>
      <output data-testid="indicator-top">
        {drag.indicator.visible ? String(drag.indicator.top) : ''}
      </output>
    </div>
  )
}

function pointer(type: string, options: PointerEventInit): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 7,
    ...options,
  })
}

function pointerDown(element: Element, clientY: number, options: PointerEventInit = {}): void {
  fireEvent(element, pointer('pointerdown', { clientY, clientX: 20, ...options }))
}

function setRowRects(container: HTMLElement, rowCount: number): void {
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect(10, 10, 200, rowCount * 20))
  for (let index = 0; index < rowCount; index += 1) {
    const row = screen.getByTestId(`row-${index}`)
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(rect(10, 10 + index * 20, 200, 20))
  }
}

function renderHarness(
  props: Partial<HarnessProps> = {},
): ReturnType<typeof render> & { dataSource: RowRecord[]; onSort: ReturnType<typeof vi.fn> } {
  const dataSource = props.dataSource ?? [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
    { key: 'd', label: 'D' },
  ]
  const onSort = vi.fn()
  ;(globalThis as unknown as {
    __rowDragContainerRef?: React.RefObject<HTMLDivElement | null>
  }).__rowDragContainerRef = { current: null }
  const result = render(
    <TestHarness
      dataSource={dataSource}
      onSort={props.onSort ?? onSort}
      options={props.options}
    />,
  )
  setRowRects(screen.getByTestId('row-container'), dataSource.length)
  return { ...result, dataSource, onSort }
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (globalThis as { __rowDragContainerRef?: unknown }).__rowDragContainerRef
})

describe('useRowDragSort', () => {
  it('sorts a row on primary pointer drag and clears transient transforms on drop', () => {
    const { onSort } = renderHarness()
    const row0 = screen.getByTestId('row-0')
    const row1 = screen.getByTestId('row-1')
    const row2 = screen.getByTestId('row-2')

    act(() => {
      pointerDown(row0, 15)
    })
    expect(screen.getByTestId('drag-state')).toHaveTextContent('0:0')

    act(() => {
      window.dispatchEvent(pointer('pointermove', { clientY: 65, clientX: 20 }))
    })

    expect(screen.getByTestId('drag-state')).toHaveTextContent('0:2')
    expect(screen.getByTestId('indicator-top')).toHaveTextContent('60')
    expect(row1).toHaveClass('dg-drag-row-yield')
    expect(row2).toHaveClass('dg-drag-row-yield')
    expect(row1.style.transform).toBe('translateY(-20px)')

    act(() => {
      window.dispatchEvent(pointer('pointerup', { clientY: 65, clientX: 20 }))
    })

    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort.mock.calls[0]![0].map((record) => record.key)).toEqual(['b', 'c', 'a', 'd'])
    expect(screen.getByTestId('drag-state')).toHaveTextContent('')
    expect(row1).not.toHaveClass('dg-drag-row-yield')
    expect(row1.style.transform).toBe('')
  })

  it('requires the configured handle selector before starting a drag', () => {
    const { onSort } = renderHarness({ options: { handleSelector: '.drag-handle' } })

    act(() => {
      pointerDown(screen.getByTestId('row-0'), 15)
      window.dispatchEvent(pointer('pointermove', { clientY: 65, clientX: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientY: 65, clientX: 20 }))
    })

    expect(onSort).not.toHaveBeenCalled()
    expect(screen.getByTestId('drag-state')).toHaveTextContent('')

    act(() => {
      pointerDown(screen.getByTestId('handle-0'), 15)
      window.dispatchEvent(pointer('pointermove', { clientY: 65, clientX: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientY: 65, clientX: 20 }))
    })

    expect(onSort).toHaveBeenCalledTimes(1)
  })

  it('moves selected rows as a block when the dragged row is selected', () => {
    const dataSource = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
      { key: 'c', label: 'C' },
      { key: 'd', label: 'D' },
      { key: 'e', label: 'E' },
    ]
    const { onSort } = renderHarness({
      dataSource,
      options: { selectedRowKeys: ['b', 'c'] },
    })

    act(() => {
      pointerDown(screen.getByTestId('row-1'), 35)
      window.dispatchEvent(pointer('pointermove', { clientY: 85, clientX: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientY: 85, clientX: 20 }))
    })

    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort.mock.calls[0]![0].map((record) => record.key)).toEqual(['a', 'd', 'b', 'c', 'e'])
  })

  it('ignores non-primary buttons and unrelated pointer ids', () => {
    const { onSort } = renderHarness()
    const row0 = screen.getByTestId('row-0')

    act(() => {
      pointerDown(row0, 15, { button: 2 })
      window.dispatchEvent(pointer('pointermove', { clientY: 65, clientX: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientY: 65, clientX: 20 }))
    })
    expect(onSort).not.toHaveBeenCalled()

    act(() => {
      pointerDown(row0, 15)
      window.dispatchEvent(pointer('pointermove', { pointerId: 8, clientY: 65, clientX: 20 }))
      window.dispatchEvent(pointer('pointerup', { pointerId: 8, clientY: 65, clientX: 20 }))
    })

    expect(onSort).not.toHaveBeenCalled()
    expect(screen.getByTestId('drag-state')).toHaveTextContent('0:0')
  })
})
