import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderBodyCells } from '../../../../src/table/engine/BodyGrid'
import type {
  EngineExpandState,
  EngineLeafColumn,
  EngineSemantic,
  EngineTableProps,
  EngineTreeState,
} from '../../../../src/table/engine/types'
import type { CellMergePlan } from '../../../../src/table/engine/cellMerge'
import type { LeafStickyInfo } from '../../../../src/table/engine/useStickyColumns'

/**
 * BodyGrid unit tests (renderBodyCells + internal BodyCell).
 *
 * Strategy: BodyCell is file-private (not exported) - covered indirectly via renderBodyCells.
 *   - Element-tree assertions: renderBodyCells returns an array of <BodyCell> JSX elements (not yet rendered).
 *     Reading .props gives the props passed to BodyCell (colIdx/index/merge/rowSpanTracks/isHovered/...),
 *     which are the inputs for all derived state (className, style, data attrs, hover) inside BodyCell.
 *     Aligns with SummaryLayer.test.tsx / HeaderGrid.test.tsx element-tree assertion style.
 *   - DOM-behavior assertions (hover/events/title): use RTL render to mount, fireEvent to trigger onMouseEnter/Leave.
 */

type Row = { id: number; name: string; age: number }

const dataSource: Array<Row> = [
  { id: 1, name: 'Ada', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Cy', age: 40 },
]

const leafColumns: Array<EngineLeafColumn<Row>> = [
  { key: 'name', dataIndex: 'name' },
  { key: 'age', dataIndex: 'age' },
]

/**
 * 取出 out 中所有 <BodyCell> 元素（跳过 undefined / 非 element）。
 * BodyRow 分支下，元素是 <BodyRow> 包裹，children 才是 BodyCell；这里递归一层。
 */
function collectBodyCellElements(out: Array<ReactNode>): Array<ReactElement<Record<string, any>>> {
  const cells: Array<ReactElement<Record<string, any>>> = []
  const visit = (node: ReactNode) => {
    if (!isValidElement(node)) return
    // BodyCell 元素：props 上有 colIdx + column + index + merge + rowSpanTracks
    const props = (node as ReactElement<Record<string, any>>).props as Record<string, unknown>
    if (
      typeof props.colIdx === 'number' &&
      'column' in props &&
      typeof props.index === 'number'
    ) {
      cells.push(node as ReactElement<Record<string, any>>)
      return
    }
    // 否则尝试递归一层 children（BodyRow 包裹分支）
    const children = props.children
    if (Array.isArray(children)) {
      children.forEach(visit)
    } else if (children !== undefined && children !== null && children !== false && children !== true) {
      if (isValidElement(children)) visit(children)
    }
  }
  out.forEach(visit)
  return cells
}

const baseProps = {
  virtualEnabled: false,
  virtualState: { start: 0, end: dataSource.length },
  cellMergePlan: null,
  expandEnabled: false,
  expandState: undefined,
  rowKey: 'id' as const,
  hoveredRowIndex: null,
  setHoveredRowIndex: vi.fn(),
  rowLineBase: (index: number) => index + 1,
  leafSticky: [] as Array<LeafStickyInfo | undefined>,
  treeEnabled: false,
  treeState: undefined,
  treeFirstDataColumnIdx: -1,
  components: undefined,
}

describe('renderBodyCells - basic rendering', () => {
  it('produces rows*cols cells (column-first branch) with correct BodyCell props', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
    })

    // 列优先：col0 三行 + col1 三行 = 6 个 cell
    expect(out).toHaveLength(6)
    expect(out.every(n => isValidElement(n))).toBe(true)

    const cells = collectBodyCellElements(out)
    expect(cells).toHaveLength(6)

    // 第一个 cell：colIdx=0, index=0, rowLine=1
    expect(cells[0].props.colIdx).toBe(0)
    expect(cells[0].props.index).toBe(0)
    expect(cells[0].props.rowLine).toBe(1)
    expect(cells[0].props.column.key).toBe('name')
    expect(cells[0].props.record).toEqual({ id: 1, name: 'Ada', age: 30 })
    // 行优先展开顺序：col0 row0/1/2，col1 row0/1/2
    expect(cells[5].props.colIdx).toBe(1)
    expect(cells[5].props.index).toBe(2)
    expect(cells[5].props.column.key).toBe('age')
  })

  it('respects virtual window (only renders sliced range)', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      virtualEnabled: true,
      virtualState: { start: 1, end: 3 }, // 仅渲染 index 1,2
    })

    const cells = collectBodyCellElements(out)
    expect(cells).toHaveLength(4) // 2 cols * 2 rows
    const indexes = cells.map(c => c.props.index)
    // column-first: col0 [1,2], then col1 [1,2]
    expect(indexes).toEqual([1, 2, 1, 2])
  })

  it('skips undefined records at boundary (no crash, no cell)', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource: [...dataSource, undefined as unknown as Row],
    })

    const cells = collectBodyCellElements(out)
    // undefined record 被跳过；仍是 6 格
    expect(cells).toHaveLength(6)
  })

  it('passes rowLineBase(rowLine) to each BodyCell', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      rowLineBase: (i) => 100 + i,
    })
    const cells = collectBodyCellElements(out)
    expect(cells[0].props.rowLine).toBe(100) // col0 row0
    expect(cells[3].props.rowLine).toBe(100) // col1 row0 (column-first: cells[3] is col1's first row)
  })
})

describe('renderBodyCells - imperative cell element path', () => {
  it('passes same-column pooled elements as oldElement in reuse mode', async () => {
    const oldElement = document.createElement('span')
    oldElement.textContent = 'old'
    const renderCellElement = vi.fn((params, old: HTMLElement | undefined) => {
      const element = old ?? document.createElement('span')
      element.textContent = String(params.value)
      return element
    })
    const pool = {
      acquire: vi.fn(() => oldElement),
      release: vi.fn(),
    }
    const recyclingColumns: Array<EngineLeafColumn<Row>> = [
      {
        key: 'name',
        dataIndex: 'name',
        gridColumnOptions: { renderCellElement },
      },
    ]

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: recyclingColumns,
      dataSource: [dataSource[0]],
      virtualEnabled: true,
      virtualState: { start: 0, end: 1 },
      cellElementMode: 'reuse',
      cellElementPool: pool,
    })
    const { unmount } = render(<div>{out}</div>)

    await waitFor(() => expect(renderCellElement).toHaveBeenCalled())
    expect(pool.acquire).toHaveBeenCalledWith(recyclingColumns[0])
    expect(renderCellElement).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 'Ada',
        record: dataSource[0],
        rowIndex: 0,
        columnIndex: 0,
        columnKey: 'name',
        rowKey: 1,
      }),
      oldElement,
    )
    expect(screen.getByText('Ada')).toBe(oldElement)

    unmount()
    expect(pool.release).toHaveBeenCalledWith(
      recyclingColumns[0],
      oldElement,
      expect.objectContaining({ value: 'Ada', rowKey: 1 }),
    )
  })

  it('does not acquire from the pool in no-reuse mode', async () => {
    const renderCellElement = vi.fn((params) => {
      const element = document.createElement('span')
      element.textContent = String(params.value)
      return element
    })
    const pool = {
      acquire: vi.fn(() => document.createElement('span')),
      release: vi.fn(),
    }
    const recyclingColumns: Array<EngineLeafColumn<Row>> = [
      {
        key: 'name',
        dataIndex: 'name',
        gridColumnOptions: { renderCellElement },
      },
    ]

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: recyclingColumns,
      dataSource: [dataSource[0]],
      virtualEnabled: true,
      virtualState: { start: 0, end: 1 },
      cellElementMode: 'no-reuse',
      cellElementPool: pool,
    })
    render(<div>{out}</div>)

    await waitFor(() => expect(renderCellElement).toHaveBeenCalled())
    expect(pool.acquire).not.toHaveBeenCalled()
    expect(renderCellElement).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'Ada' }),
      undefined,
    )
    expect(screen.getByText('Ada')).toBeInstanceOf(HTMLSpanElement)
  })

  it('does not rerun the imperative renderer when React rerenders with the same cell params', async () => {
    const renderCellElement = vi.fn((params) => {
      const element = document.createElement('span')
      element.textContent = String(params.value)
      return element
    })
    const recyclingColumns: Array<EngineLeafColumn<Row>> = [
      {
        key: 'name',
        dataIndex: 'name',
        gridColumnOptions: { renderCellElement },
      },
    ]
    const stablePool = {
      acquire: vi.fn(),
      release: vi.fn(),
    }

    function Harness({ tick }: { tick: number }) {
      const out = renderBodyCells<Row>({
        ...baseProps,
        leafColumns: recyclingColumns,
        dataSource: [dataSource[0]],
        virtualEnabled: true,
        virtualState: { start: 0, end: 1 },
        cellElementMode: 'reuse',
        cellElementPool: stablePool,
      })
      return <div data-tick={tick}>{out}</div>
    }

    const { rerender } = render(<Harness tick={0} />)
    await waitFor(() => expect(renderCellElement).toHaveBeenCalledTimes(1))

    rerender(<Harness tick={1} />)

    await new Promise((resolve) => window.setTimeout(resolve, 20))
    expect(renderCellElement).toHaveBeenCalledTimes(1)
  })
})

describe('renderBodyCells - BodyRow wrap branch vs column-first branch', () => {
  it('column-first branch: out is flat BodyCell elements (no BodyRow wrapper)', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
    })

    // 列优先：6 个平铺 BodyCell 元素（无 BodyRow 包裹）
    expect(out).toHaveLength(6)
    // 每个 out 元素本身即是 BodyCell（有 colIdx/column/index/...）
    expect(out.every(n => isValidElement(n) && 'colIdx' in (n as ReactElement<Record<string, any>>).props)).toBe(true)
    // 没有 BodyRow 包裹（无 children 数组）
    expect(out.every(n => {
      if (!isValidElement(n)) return false
      const props = (n as ReactElement<Record<string, any>>).props as Record<string, unknown>
      return props.children === undefined
    })).toBe(true)
  })

  it('BodyRow branch: wraps each row\'s cells in BodyRow element with index/record/rowKey props', () => {
    const BodyRow = (({ children }: { children?: ReactNode }) =>
      <>{children}</>) as unknown as React.ComponentType<any>
    const components: EngineTableProps<Row>['components'] = { body: { row: BodyRow } }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      components,
    })

    // out 顶层 3 个 BodyRow 元素（每行一个），含 index/record/rowKey props
    expect(out).toHaveLength(3)
    expect(out.every(n => isValidElement(n))).toBe(true)
    const rowEls = out as Array<ReactElement<Record<string, any>>>
    expect(rowEls[0].props).toMatchObject({ index: 0, record: dataSource[0], rowKey: 1 })
    expect(rowEls[1].props).toMatchObject({ index: 1, record: dataSource[1], rowKey: 2 })
    expect(rowEls[2].props).toMatchObject({ index: 2, record: dataSource[2], rowKey: 3 })
    // 每个 BodyRow 的 children 是该行的 2 个 cell
    const cells = collectBodyCellElements(out)
    expect(cells).toHaveLength(6) // 总数仍 6

    // BodyRow 分支下 cell 是按行遍历的：第一行两格 (col0,col1)，第二行两格...
    // collectBodyCellElements 按递归遍历顺序：row0[col0,col1], row1[col0,col1], row2[col0,col1]
    const colIdxs = cells.map(c => c.props.colIdx)
    expect(colIdxs).toEqual([0, 1, 0, 1, 0, 1])
    const indexes = cells.map(c => c.props.index)
    expect(indexes).toEqual([0, 0, 1, 1, 2, 2])
  })

  it('BodyRow branch skips undefined records (does not wrap undefined row)', () => {
    const BodyRow = (({ children }: any) => <>{children}</>) as unknown as React.ComponentType<any>
    const components: EngineTableProps<Row>['components'] = { body: { row: BodyRow } }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource: [...dataSource, undefined as unknown as Row],
      components,
    })

    // undefined 不进 BodyRow；out 仍是 3 个 BodyRow 元素
    expect(out).toHaveLength(3)
  })

  it('BodyRow branch: column-first vs BodyRow produce same cell count and same set of (colIdx,index) pairs', () => {
    // 两种遍历顺序在 grid 显式定位下视觉等价：cell 集合相同
    const colFirst = collectBodyCellElements(renderBodyCells<Row>({
      ...baseProps, leafColumns, dataSource,
    }))
    const BodyRow = (({ children }: any) => <>{children}</>) as unknown as React.ComponentType<any>
    const rowFirst = collectBodyCellElements(renderBodyCells<Row>({
      ...baseProps, leafColumns, dataSource,
      components: { body: { row: BodyRow } } as EngineTableProps<Row>['components'],
    }))

    expect(colFirst).toHaveLength(rowFirst.length)
    const sortKey = (c: ReactElement<Record<string, any>>) => `${c.props.colIdx}-${c.props.index}`
    const colFirstKeys = colFirst.map(sortKey).sort()
    const rowFirstKeys = rowFirst.map(sortKey).sort()
    expect(rowFirstKeys).toEqual(colFirstKeys)
  })
})

describe('renderBodyCells - computeMerge track offset (expand × rowSpan)', () => {
  /** 第二列 rowSpan=2 跨两行（hidden 标记在覆盖格）。 */
  const mergeRowSpan2: CellMergePlan = [
    // col0 (name): 无合并
    [
      { hidden: false, colSpan: 1, rowSpan: 1 },
      { hidden: false, colSpan: 1, rowSpan: 1 },
      { hidden: false, colSpan: 1, rowSpan: 1 },
    ],
    // col1 (age): row0 跨 2 行；row1 被覆盖 hidden
    [
      { hidden: false, colSpan: 1, rowSpan: 2 },
      { hidden: true, colSpan: 1, rowSpan: 1 },
      { hidden: false, colSpan: 1, rowSpan: 1 },
    ],
  ]

  it('skips hidden cells (computeMerge returns null)', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: mergeRowSpan2,
    })

    const cells = collectBodyCellElements(out)
    // col0: 3 cells (无合并)
    // col1: 2 cells (row1 hidden 被跳过)
    expect(cells).toHaveLength(5)

    // 第二列第一格（rowSpan=2）→ rowSpanTracks=2
    const col1Row0 = cells.find(c => c.props.colIdx === 1 && c.props.index === 0)!
    expect(col1Row0.props.rowSpanTracks).toBe(2)
    expect(col1Row0.props.merge).toEqual({ hidden: false, colSpan: 1, rowSpan: 2 })
  })

  it('expand extraTracks: rowSpan>1 + expandable rows inside the span add tracks', () => {
    // 构造 expand state：所有行 expandable 且展开
    const expandState: EngineExpandState = {
      expandEnabled: true,
      isExpanded: () => true,
      isExpandable: () => true,
      expandableKeySet: new Set([1, 2, 3]),
      expandedRowRender: () => null,
      toggleExpand: vi.fn(),
      showExpandColumn: false,
    }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: mergeRowSpan2,
      expandEnabled: true,
      expandState,
    })

    const cells = collectBodyCellElements(out)
    // col1 row0：rowSpan=2 跨 row0+row1，两行都 expandable → extraTracks=2 → rowSpanTracks=4
    const col1Row0 = cells.find(c => c.props.colIdx === 1 && c.props.index === 0)!
    expect(col1Row0.props.rowSpanTracks).toBe(4)
  })

  it('expand expandedRowOffset: clamps offset and adds 1 track to single-row span cells before offset', () => {
    // expandedRowOffset=1：cellEnd <= offset（即 colIdx=0 的 cell，cellEnd=1<=1）触发 +1 track
    const expandState: EngineExpandState = {
      expandEnabled: true,
      isExpanded: () => true,
      isExpandable: () => true,
      expandableKeySet: new Set([1, 2, 3]),
      expandedRowRender: () => null,
      toggleExpand: vi.fn(),
      showExpandColumn: false,
      expandedRowOffset: 1,
    }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: null,
      expandEnabled: true,
      expandState,
    })

    const cells = collectBodyCellElements(out)
    // col0 cellEnd=1 <= offset=1 且 row0 expandable+expanded → rowSpanTracks=2
    const col0Row0 = cells.find(c => c.props.colIdx === 0 && c.props.index === 0)!
    expect(col0Row0.props.rowSpanTracks).toBe(2)
    // col1 cellEnd=2 > offset=1 → 不触发 +1，rowSpanTracks=1
    const col1Row0 = cells.find(c => c.props.colIdx === 1 && c.props.index === 0)!
    expect(col1Row0.props.rowSpanTracks).toBe(1)
  })

  it('expand expandedRowOffset clamps invalid values to 0 (NaN / negative)', () => {
    const makeExpand = (offset: number): EngineExpandState => ({
      expandEnabled: true,
      isExpanded: () => true,
      isExpandable: () => true,
      expandableKeySet: new Set([1, 2, 3]),
      expandedRowRender: () => null,
      toggleExpand: vi.fn(),
      showExpandColumn: false,
      expandedRowOffset: offset,
    })

    for (const badOffset of [Number.NaN, -3]) {
      const out = renderBodyCells<Row>({
        ...baseProps,
        leafColumns,
        dataSource,
        cellMergePlan: null,
        expandEnabled: true,
        expandState: makeExpand(badOffset),
      })
      const cells = collectBodyCellElements(out)
      // NaN / 负数 clamp 到 0 → 不触发 +1 track，rowSpanTracks=1
      for (const cell of cells) {
        expect(cell.props.rowSpanTracks).toBe(1)
      }
    }
  })

  it('expand expandedRowOffset clamps out-of-range to leafColumns.length-1 (no extra track beyond)', () => {
    // 999 clamp 到 leafColumns.length-1 = 1；col0 cellEnd=1<=1 → +1 track
    // 这里反而是有效边界，不会越界——验证 clamp 后逻辑正常
    const expandState: EngineExpandState = {
      expandEnabled: true,
      isExpanded: () => true,
      isExpandable: () => true,
      expandableKeySet: new Set([1, 2, 3]),
      expandedRowRender: () => null,
      toggleExpand: vi.fn(),
      showExpandColumn: false,
      expandedRowOffset: 999,
    }
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: null,
      expandEnabled: true,
      expandState,
    })
    const cells = collectBodyCellElements(out)
    // col0 cellEnd=1 <= clamp(999)=1 → +1 track → rowSpanTracks=2
    const col0Row0 = cells.find(c => c.props.colIdx === 0 && c.props.index === 0)!
    expect(col0Row0.props.rowSpanTracks).toBe(2)
    // col1 cellEnd=2 > 1 → 不触发 → rowSpanTracks=1
    const col1Row0 = cells.find(c => c.props.colIdx === 1 && c.props.index === 0)!
    expect(col1Row0.props.rowSpanTracks).toBe(1)
  })

  it('expand not expanded: does NOT add track even if offset matches', () => {
    const expandState: EngineExpandState = {
      expandEnabled: true,
      isExpanded: () => false, // 未展开
      isExpandable: () => true,
      expandableKeySet: new Set([1, 2, 3]),
      expandedRowRender: () => null,
      toggleExpand: vi.fn(),
      showExpandColumn: false,
      expandedRowOffset: 1,
    }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: null,
      expandEnabled: true,
      expandState,
    })

    const cells = collectBodyCellElements(out)
    const col0Row0 = cells.find(c => c.props.colIdx === 0 && c.props.index === 0)!
    // isExpanded=false → 不加 track
    expect(col0Row0.props.rowSpanTracks).toBe(1)
  })

  it('expand not expandable: does NOT add track (isExpandable=false)', () => {
    const expandState: EngineExpandState = {
      expandEnabled: true,
      isExpanded: () => true,
      isExpandable: () => false, // 不可展开
      expandableKeySet: new Set(),
      expandedRowRender: () => null,
      toggleExpand: vi.fn(),
      showExpandColumn: false,
      expandedRowOffset: 1,
    }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: null,
      expandEnabled: true,
      expandState,
    })

    const cells = collectBodyCellElements(out)
    const col0Row0 = cells.find(c => c.props.colIdx === 0 && c.props.index === 0)!
    expect(col0Row0.props.rowSpanTracks).toBe(1)
  })

  it('colSpan>=2 still applies (colSpan passed through merge prop)', () => {
    const mergeColSpan2: CellMergePlan = [
      [{ hidden: false, colSpan: 2, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }],
      // col1 row0 hidden (被 col0 row0 的 colSpan=2 覆盖)
      [{ hidden: true, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }],
    ]

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: mergeColSpan2,
    })

    const cells = collectBodyCellElements(out)
    const col0Row0 = cells.find(c => c.props.colIdx === 0 && c.props.index === 0)!
    expect(col0Row0.props.merge).toEqual({ hidden: false, colSpan: 2, rowSpan: 1 })
  })
})

describe('renderBodyCells - data-known-size (colIdx===0 only)', () => {
  it('writes data-known-size on first column cell when effectiveRowHeight provided', () => {
    const effectiveRowHeight = vi.fn((index: number) => 40 + index)
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      effectiveRowHeight,
    })

    const cells = collectBodyCellElements(out)
    expect(cells[0].props.effectiveRowHeight).toBe(effectiveRowHeight)
    expect(cells[3].props.effectiveRowHeight).toBe(effectiveRowHeight) // col1 也透传 effectiveRowHeight，但内部 colIdx !== 0 不写

    // 渲染到 DOM 验证 attr
    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const col0Cells = Array.from(grid.querySelectorAll('[data-column-key="name"]'))
    const col1Cells = Array.from(grid.querySelectorAll('[data-column-key="age"]'))
    expect(col0Cells.length).toBe(3)
    expect(col1Cells.length).toBe(3)
    // colIdx=0 写
    expect(col0Cells[0]).toHaveAttribute('data-known-size', '40')
    expect(col0Cells[1]).toHaveAttribute('data-known-size', '41')
    expect(col0Cells[2]).toHaveAttribute('data-known-size', '42')
    // col1 不写
    for (const cell of col1Cells) {
      expect(cell).not.toHaveAttribute('data-known-size')
    }
    expect(effectiveRowHeight).toHaveBeenCalledWith(0)
    expect(effectiveRowHeight).toHaveBeenCalledWith(1)
    expect(effectiveRowHeight).toHaveBeenCalledWith(2)
  })

  it('does NOT write data-known-size when effectiveRowHeight is undefined', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      // effectiveRowHeight: undefined
    })
    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    for (const cell of Array.from(grid.querySelectorAll('.dg-cell-body'))) {
      expect(cell).not.toHaveAttribute('data-known-size')
    }
  })

  it('does NOT write data-known-size on hidden/skipped col0 cell (computeMerge null path)', () => {
    // col0 row1 hidden
    const merge: CellMergePlan = [
      [{ hidden: false, colSpan: 1, rowSpan: 1 }, { hidden: true, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }],
      [{ hidden: false, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }],
    ]
    const effectiveRowHeight = vi.fn(() => 50)
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: merge,
      effectiveRowHeight,
    })

    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const col0Cells = Array.from(grid.querySelectorAll('[data-column-key="name"]')) as HTMLElement[]
    // col0 row1 跳过 → 只有 row0 + row2 写
    expect(col0Cells).toHaveLength(2)
    expect(col0Cells[0]).toHaveAttribute('data-known-size', '50')
    expect(col0Cells[1]).toHaveAttribute('data-known-size', '50')
    expect(effectiveRowHeight).toHaveBeenCalledWith(0)
    expect(effectiveRowHeight).toHaveBeenCalledWith(2)
    expect(effectiveRowHeight).not.toHaveBeenCalledWith(1) // row1 hidden 跳过
  })
})

describe('renderBodyCells - hover behavior', () => {
  it('inline onHoverEnter/onHoverLeave call setHoveredRowIndex via DOM events (column-first branch)', () => {
    const setHoveredRowIndex = vi.fn()
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      setHoveredRowIndex,
    })

    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const row1Cells = Array.from(grid.querySelectorAll('[data-row-index="1"]'))
    expect(row1Cells.length).toBeGreaterThan(0)
    fireEvent.mouseEnter(row1Cells[0])
    expect(setHoveredRowIndex).toHaveBeenCalledWith(1)
    fireEvent.mouseLeave(row1Cells[0])
    expect(setHoveredRowIndex).toHaveBeenCalledWith(null)
  })

  it('BodyRow branch also wires hover handlers', () => {
    const setHoveredRowIndex = vi.fn()
    const BodyRow = ({ children }: any) => <>{children}</>
    const components: EngineTableProps<Row>['components'] = { body: { row: BodyRow } }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      components,
      setHoveredRowIndex,
    })

    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const row2Cells = Array.from(grid.querySelectorAll('[data-row-index="2"]'))
    expect(row2Cells.length).toBeGreaterThan(0)
    fireEvent.mouseEnter(row2Cells[0])
    expect(setHoveredRowIndex).toHaveBeenCalledWith(2)
  })

  it('rowHoverable=false: hover handlers NOT bound (setHoveredRowIndex not called)', () => {
    const setHoveredRowIndex = vi.fn()
    const onRowUserEnter = vi.fn()
    const onRow = () => ({ onMouseEnter: onRowUserEnter })
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      setHoveredRowIndex,
      rowHoverable: false,
      onRow,
    })

    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const cell = grid.querySelector('[data-row-index="0"]')!
    fireEvent.mouseEnter(cell)
    // rowHoverable=false → mergeHoverEventHandler 返回 userHandler，applyHover 不调
    expect(setHoveredRowIndex).not.toHaveBeenCalled()
    // 但 onRow 的 onMouseEnter 仍调用
    expect(onRowUserEnter).toHaveBeenCalled()
  })

  it('rowHoverable=true (default): hover also triggers user handler', () => {
    const setHoveredRowIndex = vi.fn()
    const onRowUserEnter = vi.fn()
    const onRow = () => ({ onMouseEnter: onRowUserEnter })
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      setHoveredRowIndex,
      onRow,
    })

    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const cell = grid.querySelector('[data-row-index="0"]')!
    fireEvent.mouseEnter(cell)
    expect(setHoveredRowIndex).toHaveBeenCalledWith(0)
    expect(onRowUserEnter).toHaveBeenCalled()
  })
})

describe('renderBodyCells - rowSpan hover (isRowSpanHovered integration)', () => {
  it('rowSpan>1 cell gets dg-row-hover when hoveredRowIndex falls inside its span', () => {
    const mergeRowSpan3: CellMergePlan = [
      [
        { hidden: false, colSpan: 1, rowSpan: 1 },
        { hidden: false, colSpan: 1, rowSpan: 1 },
        { hidden: false, colSpan: 1, rowSpan: 1 },
      ],
      [
        // col1 row0 跨 3 行；row1/row2 hidden
        { hidden: false, colSpan: 1, rowSpan: 3 },
        { hidden: true, colSpan: 1, rowSpan: 1 },
        { hidden: true, colSpan: 1, rowSpan: 1 },
      ],
    ]

    // hoveredRowIndex=2（在 row0..row2 span 内）→ col1 row0 cell isHovered
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: mergeRowSpan3,
      hoveredRowIndex: 2,
    })

    const cells = collectBodyCellElements(out)
    // col1 row0（rowSpan=3，覆盖 row0..row2）→ isHovered=true
    const col1Row0 = cells.find(c => c.props.colIdx === 1 && c.props.index === 0)!
    expect(col1Row0.props.isHovered).toBe(true)
    // rowSpanTracks=3（无 expand）
    expect(col1Row0.props.rowSpanTracks).toBe(3)

    // col0 row2（index=2, hoveredRowIndex=2, rowSpan=1）→ isHovered
    const col0Row2 = cells.find(c => c.props.colIdx === 0 && c.props.index === 2)!
    expect(col0Row2.props.isHovered).toBe(true)

    // col0 row0（index=0, hoveredRowIndex=2, rowSpan=1）→ 不在 hover
    const col0Row0 = cells.find(c => c.props.colIdx === 0 && c.props.index === 0)!
    expect(col0Row0.props.isHovered).toBe(false)
  })

  it('rowSpan>1 cell NOT hovered when hoveredRowIndex outside its span', () => {
    const mergeRowSpan2: CellMergePlan = [
      [
        { hidden: false, colSpan: 1, rowSpan: 1 },
        { hidden: false, colSpan: 1, rowSpan: 1 },
        { hidden: false, colSpan: 1, rowSpan: 1 },
      ],
      [
        { hidden: false, colSpan: 1, rowSpan: 2 },
        { hidden: true, colSpan: 1, rowSpan: 1 },
        { hidden: false, colSpan: 1, rowSpan: 1 },
      ],
    ]
    // hoveredRowIndex=2（rowSpan=2 覆盖 row0+row1，不含 row2）
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: mergeRowSpan2,
      hoveredRowIndex: 2,
    })
    const cells = collectBodyCellElements(out)
    const col1Row0 = cells.find(c => c.props.colIdx === 1 && c.props.index === 0)!
    expect(col1Row0.props.isHovered).toBe(false)
  })

  it('hoveredRowIndex=null: no cell gets isHovered', () => {
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      hoveredRowIndex: null,
    })
    const cells = collectBodyCellElements(out)
    for (const cell of cells) {
      expect(cell.props.isHovered).toBe(false)
    }
  })
})

describe('renderBodyCells - resolveBodyCellEllipsisTitle integration', () => {
  it('ellipsis=true: string text → cell-inner has title=text', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', ellipsis: true },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    // text 'Ada' is direct child of .dg-cell-inner; the .dg-cell-inner element holds title
    const cellInner = document.querySelector('.dg-cell-inner')!
    expect(cellInner).toHaveAttribute('title', 'Ada')
  })

  it('ellipsis=true: number text → cell-inner has stringified title', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'age', dataIndex: 'age', ellipsis: true },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const cellInner = document.querySelector('.dg-cell-inner')!
    expect(cellInner).toHaveAttribute('title', '30')
  })

  it('ellipsis=true: numeric 0 → title="0" (does not swallow falsy)', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'age', dataIndex: 'age', ellipsis: true },
    ]
    const data: Array<Row> = [{ id: 1, name: 'Ada', age: 0 }]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource: data,
    })
    render(<div>{out}</div>)
    const cellInner = document.querySelector('.dg-cell-inner')!
    expect(cellInner).toHaveAttribute('title', '0')
  })

  it('ellipsis=true with showTitle=false: NO title attr (let custom Tooltip take over)', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', ellipsis: true, showTitle: false },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const cellInner = document.querySelector('.dg-cell-inner')!
    expect(cellInner).not.toHaveAttribute('title')
    // 但 ellipsis class 仍在（cell 父元素）
    const cell = cellInner.parentElement!
    expect(cell.className).toContain('dg-cell-ellipsis')
  })

  it('ellipsis=false (no ellipsis column): NO title, NO dg-cell-ellipsis class', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name' }, // 无 ellipsis
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const cellInner = document.querySelector('.dg-cell-inner')!
    expect(cellInner).not.toHaveAttribute('title')
    const cell = cellInner.parentElement!
    expect(cell.className).not.toContain('dg-cell-ellipsis')
  })

  it('ellipsis=true with object dataIndex value: text is object → NO title', () => {
    // Use string dataIndex but provide object via render to keep text non-string/number
    // Actually getValueByDataIndex returns record[dataIndex]; we put a non-coercible value
    // by using a render fn that ignores text. But resolveBodyCellEllipsisTitle uses `text`
    // (raw dataIndex value), not render output. So set the dataIndex value itself to an object.
    type ObjRow2 = { id: number; meta: { tag: string } }
    const cols: Array<EngineLeafColumn<ObjRow2>> = [
      { key: 'meta', dataIndex: 'meta', ellipsis: true,
        // Provide render so cell content renders without crashing (object can't be a React child)
        render: () => 'rendered-text',
      },
    ]
    const data: Array<ObjRow2> = [{ id: 1, meta: { tag: 'x' } }]
    const out = renderBodyCells<ObjRow2>({
      ...baseProps,
      leafColumns: cols,
      dataSource: data,
    })
    render(<div>{out}</div>)
    // text={tag:'x'} is object → resolveBodyCellEllipsisTitle returns undefined → no title
    const cellInner = document.querySelector('.dg-cell-inner')!
    expect(cellInner).not.toHaveAttribute('title')
  })
})

describe('renderBodyCells - onCell/onRow/rowClassName injected props', () => {
  it('onRow className/style merged into cell; column.className + rowClassName joined', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', className: 'col-name', style: { color: 'blue' } },
    ]
    const onRow = vi.fn((record: Row) => ({
      className: `row-${record.id}`,
      style: { backgroundColor: 'yellow' },
    }))
    const rowClassName = (record: Row) => `rc-${record.id}`

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
      onRow,
      rowClassName,
    })

    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const cell = grid.querySelector('[data-row-index="0"]')! as HTMLElement
    // 合并 className: col-name rc-1 row-1（含 dg-cell 等基础类）
    expect(cell.className).toContain('col-name')
    expect(cell.className).toContain('rc-1')
    expect(cell.className).toContain('row-1')
    // 合并 style: color blue + backgroundColor yellow
    expect(cell.style.color).toBe('blue')
    expect(cell.style.backgroundColor).toBe('yellow')
    expect(onRow).toHaveBeenCalledWith(dataSource[0], 0)
  })

  it('rowSelection isRowSelected → dg-row-selected class on cell', () => {
    const isRowSelected = (record: Row) => record.id === 2
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      isRowSelected,
    })
    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const row1Cells = Array.from(grid.querySelectorAll('[data-row-index="1"]')) as HTMLElement[]
    expect(row1Cells.length).toBe(2) // 2 列
    for (const c of row1Cells) {
      expect(c.className).toContain('dg-row-selected')
    }
    const row0Cells = Array.from(grid.querySelectorAll('[data-row-index="0"]')) as HTMLElement[]
    for (const c of row0Cells) {
      expect(c.className).not.toContain('dg-row-selected')
    }
  })

  it('onRow rest props (e.g. onClick) spread onto cell', () => {
    const onClick = vi.fn()
    const onRow = () => ({ onClick })
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      onRow,
    })
    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const cell = grid.querySelector('[data-row-index="0"]')!
    fireEvent.click(cell)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('semantic body className/style injected into cell', () => {
    const semantic: EngineSemantic = {
      body: {
        className: { row: 'dg-my-row', cell: 'dg-my-cell' },
        style: {
          row: { fontSize: '12px' },
          cell: { color: 'red' },
        },
      },
    }
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      semanticBody: semantic.body,
    })
    render(<div data-testid="grid">{out}</div>)
    const grid = screen.getByTestId('grid')
    const cell = grid.querySelector('[data-row-index="0"]')! as HTMLElement
    expect(cell.className).toContain('dg-my-row')
    expect(cell.className).toContain('dg-my-cell')
    expect(cell.style.fontSize).toBe('12px')
    expect(cell.style.color).toBe('red')
  })

  it('onCell only invoked when both column.onCell and components.body.cell exist', () => {
    const onCell = vi.fn(() => ({ editable: true }))
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', onCell },
    ]
    const CustomCell = () => <span className="custom" />
    const components: EngineTableProps<Row>['components'] = { body: { cell: CustomCell } }

    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
      components,
    })
    render(<div>{out}</div>)
    expect(onCell).toHaveBeenCalledWith(dataSource[0], 0)
    expect(onCell).toHaveBeenCalledTimes(3) // 3 rows
    // CustomCell 渲染
    expect(document.querySelectorAll('.custom')).toHaveLength(3)
  })

  it('onCell NOT invoked when no components.body.cell', () => {
    const onCell = vi.fn(() => ({ editable: true }))
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', onCell },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
      // components: undefined
    })
    render(<div>{out}</div>)
    expect(onCell).not.toHaveBeenCalled()
  })
})

describe('renderBodyCells - tree indent', () => {
  it('renders tree indent in treeFirstDataColumnIdx cell (level-driven padding)', () => {
    const treeState: EngineTreeState = {
      treeEnabled: true,
      indentSize: 15,
      rowInfoMap: new Map([
        [1, { level: 2, parentKey: 0, hasChildren: true }],
      ]),
      isExpanded: () => true,
      toggleExpand: vi.fn(),
    }
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name' },
      { key: 'age', dataIndex: 'age' },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource: [dataSource[0]], // 只 row0 (id=1)
      treeEnabled: true,
      treeState,
      treeFirstDataColumnIdx: 0, // col0 渲染缩进
    })

    render(<div>{out}</div>)
    // row0 id=1 level=2 → paddingLeft = 2 * 15 = 30px
    const nameCellInner = screen.getByText('Ada').parentElement!
    const indent = nameCellInner.querySelector('.dg-tree-indent')
    expect(indent).not.toBeNull()
    expect(indent).toHaveStyle({ paddingLeft: '30px' })
    // age 列不渲染缩进
    const ageCellInner = screen.getByText('30').parentElement!
    expect(ageCellInner.querySelector('.dg-tree-indent')).toBeNull()
  })

  it('does not render tree indent when treeEnabled=false', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name' },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
      treeEnabled: false,
      treeFirstDataColumnIdx: 0,
    })
    render(<div>{out}</div>)
    expect(document.querySelector('.dg-tree-indent')).toBeNull()
  })

  it('does not render tree indent when colIdx !== treeFirstDataColumnIdx', () => {
    const treeState: EngineTreeState = {
      treeEnabled: true,
      indentSize: 15,
      rowInfoMap: new Map([
        [1, { level: 1, parentKey: null, hasChildren: true }],
      ]),
      isExpanded: () => true,
      toggleExpand: vi.fn(),
    }
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name' },
      { key: 'age', dataIndex: 'age' },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource: [dataSource[0]],
      treeEnabled: true,
      treeState,
      treeFirstDataColumnIdx: 1, // age 列才渲染缩进
    })
    render(<div>{out}</div>)
    // age 列 cell-inner 内有 dg-tree-indent；name 列没有
    const ageIndent = screen.getByText('30').parentElement!.querySelector('.dg-tree-indent')
    const nameIndent = screen.getByText('Ada').parentElement!.querySelector('.dg-tree-indent')
    expect(ageIndent).not.toBeNull()
    expect(nameIndent).toBeNull()
  })
})

describe('renderBodyCells - sorted / sticky / hidden / align / rowScope markers (DOM)', () => {
  it('isSortedColumn (column.sorter + active sortOrder) → dg-column-sort class', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', sorter: true, sortOrder: 'ascend' },
      { key: 'age', dataIndex: 'age', sorter: true, sortOrder: null },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const nameCells = Array.from(document.querySelectorAll('[data-column-key="name"]')) as HTMLElement[]
    const ageCells = Array.from(document.querySelectorAll('[data-column-key="age"]')) as HTMLElement[]
    for (const c of nameCells) expect(c.className).toContain('dg-column-sort')
    for (const c of ageCells) expect(c.className).not.toContain('dg-column-sort')
  })

  it('hidden column → dg-cell-hidden class', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', hidden: true },
      { key: 'age', dataIndex: 'age' },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const nameCells = Array.from(document.querySelectorAll('[data-column-key="name"]')) as HTMLElement[]
    for (const c of nameCells) expect(c.className).toContain('dg-cell-hidden')
  })

  it('sticky info → fixed/shadow class + sticky style', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', fixed: 'start' },
      { key: 'age', dataIndex: 'age' },
    ]
    const leafSticky: Array<LeafStickyInfo | undefined> = [
      { side: 'start', offset: 0, width: 100, isEdge: true },
      undefined,
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
      leafSticky,
    })
    render(<div>{out}</div>)
    const nameCell = document.querySelector('[data-column-key="name"]')! as HTMLElement
    expect(nameCell.className).toContain('dg-cell-fixed-start')
    expect(nameCell.className).toContain('dg-sticky-shadow-start')
    expect(nameCell.style.position).toBe('sticky')
    expect(nameCell.style.left).toBe('0px')
  })

  it('align → data-align attr + textAlign style', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', align: 'center' },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const cell = document.querySelector('[data-column-key="name"]')! as HTMLElement
    expect(cell.getAttribute('data-align')).toBe('center')
    expect(cell.style.textAlign).toBe('center')
  })

  it('rowScope="row" → dg-cell-rowscope class', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      { key: 'name', dataIndex: 'name', rowScope: 'row' },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const cell = document.querySelector('[data-column-key="name"]')! as HTMLElement
    expect(cell.className).toContain('dg-cell-rowscope')
  })

  it('renders column.render output as cell content', () => {
    const cols: Array<EngineLeafColumn<Row>> = [
      {
        key: 'name',
        dataIndex: 'name',
        render: (text: string) => <a href="#">{text}</a>,
      },
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns: cols,
      dataSource,
    })
    render(<div>{out}</div>)
    const link = screen.getByRole('link', { name: 'Ada' })
    expect(link).toBeInTheDocument()
  })

  it('rowSpan>1 cell → dg-cell-rowspan class + aria-rowspan attr', () => {
    const merge: CellMergePlan = [
      [{ hidden: false, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }],
      [{ hidden: false, colSpan: 1, rowSpan: 2 }, { hidden: true, colSpan: 1, rowSpan: 1 }, { hidden: false, colSpan: 1, rowSpan: 1 }],
    ]
    const out = renderBodyCells<Row>({
      ...baseProps,
      leafColumns,
      dataSource,
      cellMergePlan: merge,
    })
    render(<div>{out}</div>)
    const ageCell = document.querySelector('[data-column-key="age"]')! as HTMLElement
    expect(ageCell.className).toContain('dg-cell-rowspan')
    expect(ageCell.getAttribute('aria-rowspan')).toBe('2')
    expect(ageCell.style.gridRow).toBe('1 / span 2')
  })
})
