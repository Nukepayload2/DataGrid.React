import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  useColumnDragSort,
  type UseColumnDragSortOptions,
} from '../../../../src/table/engine/useColumnDragSort'

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

interface ColumnRecord {
  key: string
  gridColumnOptions?: {
    dragColumnLock?: 'lockDrag' | 'lockPosition'
  }
}

type HarnessOptions = Omit<
  UseColumnDragSortOptions<ColumnRecord>,
  'containerRef' | 'columns' | 'onSort'
>

interface HarnessProps {
  columns: ColumnRecord[]
  onSort: (next: ColumnRecord[]) => void
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

function TestHarness({ columns, onSort, options }: HarnessProps) {
  const containerRef = (globalThis as unknown as {
    __columnDragContainerRef?: React.RefObject<HTMLDivElement | null>
  }).__columnDragContainerRef!
  const drag = useColumnDragSort({
    columns,
    onSort,
    containerRef,
    autoScroll: false,
    ...options,
  })

  return (
    <div
      data-testid="column-container"
      ref={containerRef}
      {...drag.containerProps}
    >
      <div className="dg-wrapper">
        {columns.map((column, index) => (
          <div
            data-column-key={column.key}
            data-leaf-index={index}
            data-testid={`column-${index}`}
            key={column.key}
          >
            {column.key}
          </div>
        ))}
      </div>
      <output data-testid="drag-state">
        {drag.dragState ? `${drag.dragState.fromIndex}:${drag.dragState.overIndex}` : ''}
      </output>
      <output data-testid="indicator-left">
        {drag.indicator.visible ? String(drag.indicator.left) : ''}
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

function pointerDown(element: Element, clientX: number, options: PointerEventInit = {}): void {
  fireEvent(element, pointer('pointerdown', { clientX, clientY: 20, ...options }))
}

function setColumnRects(container: HTMLElement, columnCount: number): void {
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect(10, 10, columnCount * 40, 80))
  for (let index = 0; index < columnCount; index += 1) {
    const column = screen.getByTestId(`column-${index}`)
    vi.spyOn(column, 'getBoundingClientRect').mockReturnValue(rect(10 + index * 40, 10, 40, 80))
  }
}

function renderHarness(
  props: Partial<HarnessProps> = {},
): ReturnType<typeof render> & {
  columns: ColumnRecord[]
  onSort: Mock<(next: ColumnRecord[]) => void>
} {
  const columns = props.columns ?? [
    { key: 'a' },
    { key: 'b' },
    { key: 'c' },
    { key: 'd' },
  ]
  // 必须给 `vi.fn` 标出真实签名：裸 `vi.fn()` 的类型是 `Mock<Constructable | Procedure>`，
  // 既赋不进 `HarnessProps.onSort: (next: ColumnRecord[]) => void`，其 `mock.calls` 也退化成
  // `any[][]`、让 `.map((column) => …)` 的 `column` 变成隐式 any（TS7006）。
  const onSort = vi.fn<(next: ColumnRecord[]) => void>()
  ;(globalThis as unknown as {
    __columnDragContainerRef?: React.RefObject<HTMLDivElement | null>
  }).__columnDragContainerRef = { current: null }
  const result = render(
    <TestHarness
      columns={columns}
      onSort={props.onSort ?? onSort}
      options={props.options}
    />,
  )
  setColumnRects(screen.getByTestId('column-container'), columns.length)
  return { ...result, columns, onSort }
}

afterEach(() => {
  vi.restoreAllMocks()
  delete (globalThis as { __columnDragContainerRef?: unknown }).__columnDragContainerRef
})

describe('useColumnDragSort', () => {
  it('sorts a column on primary pointer drag and clears transient transforms on drop', () => {
    const { onSort } = renderHarness()
    const column0 = screen.getByTestId('column-0')
    const column1 = screen.getByTestId('column-1')
    const column2 = screen.getByTestId('column-2')

    act(() => {
      pointerDown(column0, 20)
    })
    expect(screen.getByTestId('drag-state')).toHaveTextContent('0:0')

    act(() => {
      window.dispatchEvent(pointer('pointermove', { clientX: 125, clientY: 20 }))
    })

    expect(screen.getByTestId('drag-state')).toHaveTextContent('0:2')
    expect(screen.getByTestId('indicator-left')).toHaveTextContent('120')
    expect(column0).toHaveClass('dg-drag-column-source')
    expect(column1).toHaveClass('dg-drag-column-yield')
    expect(column2).toHaveClass('dg-drag-column-yield')

    act(() => {
      window.dispatchEvent(pointer('pointerup', { clientX: 125, clientY: 20 }))
    })

    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort.mock.calls[0]![0].map((column) => column.key)).toEqual(['b', 'c', 'a', 'd'])
    expect(screen.getByTestId('drag-state')).toHaveTextContent('')
    expect(column1).not.toHaveClass('dg-drag-column-yield')
    expect(column1.style.transform).toBe('')
  })

  it('does not start when column reordering is disabled or the source column is drag locked', () => {
    const { onSort, rerender } = renderHarness({ options: { reorder: false } })

    act(() => {
      pointerDown(screen.getByTestId('column-0'), 20)
      window.dispatchEvent(pointer('pointermove', { clientX: 125, clientY: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientX: 125, clientY: 20 }))
    })

    expect(onSort).not.toHaveBeenCalled()
    expect(screen.getByTestId('drag-state')).toHaveTextContent('')

    const columns = [
      { key: 'a', gridColumnOptions: { dragColumnLock: 'lockDrag' as const } },
      { key: 'b' },
      { key: 'c' },
    ]
    rerender(
      <TestHarness
        columns={columns}
        onSort={onSort}
      />,
    )
    setColumnRects(screen.getByTestId('column-container'), columns.length)

    act(() => {
      pointerDown(screen.getByTestId('column-0'), 20)
      window.dispatchEvent(pointer('pointermove', { clientX: 95, clientY: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientX: 95, clientY: 20 }))
    })

    expect(onSort).not.toHaveBeenCalled()
    expect(screen.getByTestId('drag-state')).toHaveTextContent('')
  })

  it('keeps lockPosition columns fixed while sorting across them', () => {
    const { onSort } = renderHarness({
      columns: [
        { key: 'a' },
        { key: 'b', gridColumnOptions: { dragColumnLock: 'lockPosition' } },
        { key: 'c' },
        { key: 'd' },
      ],
    })

    act(() => {
      pointerDown(screen.getByTestId('column-0'), 20)
      window.dispatchEvent(pointer('pointermove', { clientX: 125, clientY: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientX: 125, clientY: 20 }))
    })

    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort.mock.calls[0]![0].map((column) => column.key)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('ignores non-primary buttons and unrelated pointer ids', () => {
    const { onSort } = renderHarness()
    const column0 = screen.getByTestId('column-0')

    act(() => {
      pointerDown(column0, 20, { button: 2 })
      window.dispatchEvent(pointer('pointermove', { clientX: 125, clientY: 20 }))
      window.dispatchEvent(pointer('pointerup', { clientX: 125, clientY: 20 }))
    })
    expect(onSort).not.toHaveBeenCalled()

    act(() => {
      pointerDown(column0, 20)
      window.dispatchEvent(pointer('pointermove', { pointerId: 8, clientX: 125, clientY: 20 }))
      window.dispatchEvent(pointer('pointerup', { pointerId: 8, clientX: 125, clientY: 20 }))
    })

    expect(onSort).not.toHaveBeenCalled()
    expect(screen.getByTestId('drag-state')).toHaveTextContent('0:0')
  })
})
