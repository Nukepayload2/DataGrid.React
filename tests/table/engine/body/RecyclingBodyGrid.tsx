import { useLayoutEffect, useRef, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecyclingBodyGrid } from '../../../../src/table/engine/RecyclingBodyGrid'
import type {
  EngineLeafColumn,
} from '../../../../src/table/engine/types'
import type { LeafStickyInfo } from '../../../../src/table/engine/useStickyColumns'

type Row = { id: number; name: string; age: number }

const dataSource: Array<Row> = [
  { id: 1, name: 'Ada', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Cy', age: 40 },
]

function textRenderer(params: { value: unknown }, oldElement: HTMLElement | undefined) {
  const element = oldElement ?? document.createElement('span')
  element.textContent = String(params.value)
  return element
}

function Harness({
  columns,
  start,
  end,
  tick = 0,
  rows = dataSource,
}: {
  columns: Array<EngineLeafColumn<Row>>
  start: number
  end: number
  tick?: number
  rows?: Array<Row>
}) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  useLayoutEffect(() => {
    setReady(true)
  }, [])
  return (
    <div data-testid="grid" data-tick={tick} ref={gridRef}>
      {ready ? (
        <RecyclingBodyGrid<Row>
          gridRef={gridRef}
          leafColumns={columns}
          dataSource={rows}
          virtualState={{ start, end }}
          rowLineBase={(index) => index + 2}
          leafSticky={[] as Array<LeafStickyInfo | undefined>}
          rowKey="id"
          hoveredRowIndex={null}
          setHoveredRowIndex={vi.fn()}
        />
      ) : null}
    </div>
  )
}

describe('RecyclingBodyGrid', () => {
  it('creates body cells imperatively and does not rerun inner renderers for unchanged params', async () => {
    const renderCellElement = vi.fn(textRenderer)
    const columns: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', gridColumnOptions: { renderCellElement } },
      { key: 'age', dataIndex: 'age', gridColumnOptions: { renderCellElement } },
    ]
    const { rerender } = render(
      <Harness columns={columns} start={0} end={1} />,
    )

    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())
    expect(screen.getByTestId('grid').querySelectorAll('.dg-cell-body')).toHaveLength(2)
    expect(renderCellElement).toHaveBeenCalledTimes(2)

    rerender(<Harness columns={columns} start={0} end={1} tick={1} />)

    await new Promise((resolve) => window.setTimeout(resolve, 20))
    expect(renderCellElement).toHaveBeenCalledTimes(2)
  })

  it('does not move DOM nodes again when the desired body order is already current', async () => {
    const columns: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', gridColumnOptions: { renderCellElement: textRenderer } },
      { key: 'age', dataIndex: 'age', gridColumnOptions: { renderCellElement: textRenderer } },
    ]
    const { rerender } = render(
      <Harness columns={columns} start={0} end={2} />,
    )

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    const grid = screen.getByTestId('grid')
    const insertBefore = vi.spyOn(grid, 'insertBefore')

    rerender(<Harness columns={columns} start={0} end={2} tick={1} />)

    await new Promise((resolve) => window.setTimeout(resolve, 20))
    expect(insertBefore).not.toHaveBeenCalled()
  })

  it('reuses same-column outer cells and passes pooled inner elements as oldElement', async () => {
    const renderCellElement = vi.fn(textRenderer)
    const disposeCellElement = vi.fn()
    const columns: Array<EngineLeafColumn<Row>> = [
      {
        key: 'name',
        dataIndex: 'name',
        gridColumnOptions: { renderCellElement, disposeCellElement },
      },
    ]
    const { rerender } = render(
      <Harness columns={columns} start={0} end={1} />,
    )

    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())
    const firstOuter = screen.getByTestId('grid').querySelector('.dg-cell-body')
    const firstInner = screen.getByText('Ada')

    rerender(<Harness columns={columns} start={1} end={2} />)

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    const secondOuter = screen.getByTestId('grid').querySelector('.dg-cell-body')
    expect(secondOuter).toBe(firstOuter)
    expect(renderCellElement).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: 'Bob', rowIndex: 1, rowKey: 2 }),
      firstInner,
    )
    expect(disposeCellElement).toHaveBeenCalledWith(
      firstInner,
      'recycle',
      expect.objectContaining({ value: 'Ada', rowKey: 1 }),
    )
  })

  it('patches hover class without rerunning the inner renderer', async () => {
    const renderCellElement = vi.fn(textRenderer)
    const columns: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', gridColumnOptions: { renderCellElement } },
    ]

    function HoverHarness() {
      const gridRef = useRef<HTMLDivElement | null>(null)
      const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null)
      const [ready, setReady] = useState(false)
      useLayoutEffect(() => {
        setReady(true)
      }, [])
      return (
        <div data-testid="grid" ref={gridRef}>
          {ready ? (
            <RecyclingBodyGrid<Row>
              gridRef={gridRef}
              leafColumns={columns}
              dataSource={dataSource}
              virtualState={{ start: 0, end: 1 }}
              rowLineBase={(index) => index + 2}
              leafSticky={[]}
              rowKey="id"
              hoveredRowIndex={hoveredRowIndex}
              setHoveredRowIndex={setHoveredRowIndex}
            />
          ) : null}
        </div>
      )
    }

    render(<HoverHarness />)
    await waitFor(() => expect(screen.getByText('Ada')).toBeInTheDocument())
    const cell = screen.getByTestId('grid').querySelector('.dg-cell-body') as HTMLElement
    expect(renderCellElement).toHaveBeenCalledTimes(1)

    fireEvent.mouseEnter(cell)

    await waitFor(() => expect(cell).toHaveClass('dg-row-hover'))
    expect(renderCellElement).toHaveBeenCalledTimes(1)
  })

  it('keeps body cell DOM order row-major when the virtual window changes', async () => {
    const columns: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', gridColumnOptions: { renderCellElement: textRenderer } },
      { key: 'age', dataIndex: 'age', gridColumnOptions: { renderCellElement: textRenderer } },
    ]
    const { rerender } = render(
      <Harness columns={columns} start={0} end={2} />,
    )

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    const grid = screen.getByTestId('grid')
    const readOrder = () =>
      Array.from(grid.querySelectorAll('.dg-cell-body')).map((cell) => cell.textContent)

    expect(readOrder()).toEqual(['Ada', '30', 'Bob', '25'])

    rerender(<Harness columns={columns} start={1} end={3} />)

    await waitFor(() => expect(screen.getByText('Cy')).toBeInTheDocument())
    expect(readOrder()).toEqual(['Bob', '25', 'Cy', '40'])
  })

  it('keeps body cell DOM order row-major when row identities reorder inside the same window', async () => {
    const columns: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', gridColumnOptions: { renderCellElement: textRenderer } },
      { key: 'age', dataIndex: 'age', gridColumnOptions: { renderCellElement: textRenderer } },
    ]
    const { rerender } = render(
      <Harness columns={columns} start={0} end={2} rows={[dataSource[0], dataSource[1]]} />,
    )

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    const grid = screen.getByTestId('grid')
    const readOrder = () =>
      Array.from(grid.querySelectorAll('.dg-cell-body')).map((cell) => cell.textContent)

    expect(readOrder()).toEqual(['Ada', '30', 'Bob', '25'])

    rerender(<Harness columns={columns} start={0} end={2} rows={[dataSource[1], dataSource[0]]} />)

    await waitFor(() => expect(readOrder()).toEqual(['Bob', '25', 'Ada', '30']))
  })
})
