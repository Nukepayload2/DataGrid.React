/**
 * FlatColumnCells（ColumnCells）单元测试。
 *
 * 覆盖单层表头快速路径（grid-auto-flow:column）的：
 *  - 基本渲染（1 表头格 + N 数据格）
 *  - onSorterClick(column.key)（关键回归守护：flat 路径用 key 而非 sortKey）
 *  - hover 内联（onHoverRow index / null）
 *  - data-known-size（colIdx===0 写，其他列不写）
 *  - data-column-key（表头 + 表体格）
 *  - flat 路径 onHeaderCell / onHeaderRow 注入合并
 *  - ColumnResizer pointerdown 集成
 *  - sticky 样式（fixed 列 + 表头纵向 sticky）
 *  - ellipsis title（resolveBodyCellEllipsisTitle 集成）
 *
 * 测试套路对齐：treeIndentRenderer.test.tsx（RTL render + fireEvent）。
 * 不改 FlatColumnCells.tsx 源码。
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigProvider } from 'antd'
import type { EngineLeafColumn, EngineTableProps } from '../types'
import type { LeafStickyInfo } from '../useStickyColumns'
import { ColumnCells } from '../FlatColumnCells'

type Row = { id: number; name: string; age: number }

// jsdom 不实现 PointerEvent，pointerDown 用一个合成事件触发即可。
// 这里给 firePointerDown 一个 polyfill：在 test/setup 之后由测试模块本身兜底。
beforeAll(() => {
  if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number
      pointerType: string
      isPrimary: boolean
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params)
        this.pointerId = (params.pointerId as number | undefined) ?? 0
        this.pointerType = (params.pointerType as string | undefined) ?? ''
        this.isPrimary = (params.isPrimary as boolean | undefined) ?? false
      }
    }
    ;(window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
    ;(globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
  }
})

// 直接靠 data-* / role / className 查询；不全局改 testIdAttribute（会与 data-testid 冲突）。
function renderWithProvider(node: React.ReactNode) {
  return render(<ConfigProvider>{node}</ConfigProvider>)
}

const ds: Array<Row> = [
  { id: 1, name: 'Ada', age: 36 },
  { id: 2, name: 'Bob', age: 28 },
  { id: 3, name: 'Cy', age: 41 },
]

function queryBodyCells() {
  return document.querySelectorAll('.dg-cell-body')
}
function queryHeaderCells() {
  return document.querySelectorAll('.dg-cell-header')
}

describe('ColumnCells (FlatColumnCells) - 基本渲染', () => {
  it('渲染 1 个表头格 + N 个表体格（showHeader=true）', () => {
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    expect(queryHeaderCells()).toHaveLength(1)
    expect(queryBodyCells()).toHaveLength(ds.length)
    // 内容：表头文字 + 每行的 dataIndex 值
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Cy')).toBeInTheDocument()
  })

  it('showHeader=false 时不渲染表头格，表体格仍渲染', () => {
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader={false}
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    expect(queryHeaderCells()).toHaveLength(0)
    expect(queryBodyCells()).toHaveLength(ds.length)
  })

  it('空数据源时仅渲染表头格', () => {
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={[]}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    expect(queryHeaderCells()).toHaveLength(1)
    expect(queryBodyCells()).toHaveLength(0)
  })

  it('column.render 提供时使用 render 输出', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      title: 'Name',
      render: (text) => `<<${text}>>`,
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    expect(screen.getByText('<<Ada>>')).toBeInTheDocument()
    expect(screen.getByText('<<Bob>>')).toBeInTheDocument()
  })
})

describe('ColumnCells - onSorterClick 使用 column.key（防回归守护）', () => {
  /**
   * 关键差异点：flat 路径里 onSorterClick 收到的是 column.key（不是 sortKey）。
   * 多级路径 HeaderCell 用 `cell.sortKey ?? cell.key`；flat 路径直接 column.key。
   * 在 flat 路径，collectLeaves 产物无 parentPath，故 key === sortKey 恒成立——
   * 这里防止有人把 flat 路径的 onSorterClick 改成 sortKey（不存在该字段会导致编译错或为 undefined）。
   */
  it('点可排序表头格 → onSorterClick 收到 column.key', () => {
    const onSorterClick = vi.fn()
    // 故意取一个让人想误传 sortKey 的列；flat 路径上没有 sortKey 概念。
    const column: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'age',
      title: 'Age',
      sorter: true,
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        onSorterClick={onSorterClick}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('dg-column-has-sorters')
    fireEvent.click(header)

    expect(onSorterClick).toHaveBeenCalledTimes(1)
    expect(onSorterClick).toHaveBeenCalledWith('age')
  })

  it('不可排序列不触发 onSorterClick', () => {
    const onSorterClick = vi.fn()
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      title: 'Name',
      // 无 sorter
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        onSorterClick={onSorterClick}
      />,
    )

    fireEvent.click(queryHeaderCells()[0])
    expect(onSorterClick).not.toHaveBeenCalled()
  })

  it('onSorterClick 与合并后的 onHeaderCell onClick 都触发（排序先于用户回调）', () => {
    const onSorterClick = vi.fn()
    const userOnClick = vi.fn()
    const column: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'age',
      title: 'Age',
      sorter: true,
      onHeaderCell: () => ({ onClick: userOnClick }),
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        onSorterClick={onSorterClick}
      />,
    )

    fireEvent.click(queryHeaderCells()[0])

    expect(onSorterClick).toHaveBeenCalledTimes(1)
    expect(userOnClick).toHaveBeenCalledTimes(1)
    // 排序先调用（实现：先 onSorterClick 再合并 onClick）
    expect(onSorterClick.mock.invocationCallOrder[0]).toBeLessThan(
      userOnClick.mock.invocationCallOrder[0],
    )
  })

  it('可排序列当前 sortOrder → aria-sort + dg-column-sort 类', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'age',
      title: 'Age',
      sorter: true,
      sortOrder: 'ascend',
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('dg-column-sort')
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    // 排序后的表体格也加 dg-column-sort
    queryBodyCells().forEach((cell) => {
      expect(cell).toHaveClass('dg-column-sort')
    })
  })
})

describe('ColumnCells - hover 内联', () => {
  it('pointer enter 表体格 → onHoverRow(index)；leave → onHoverRow(null)', () => {
    const onHoverRow = vi.fn()
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={onHoverRow}
      />,
    )

    const cells = queryBodyCells()
    fireEvent.mouseEnter(cells[1])
    expect(onHoverRow).toHaveBeenLastCalledWith(1)

    fireEvent.mouseLeave(cells[1])
    expect(onHoverRow).toHaveBeenLastCalledWith(null)
  })

  it('hoveredRowIndex 命中 → 对应表体格加 dg-row-hover', () => {
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={2}
        onHoverRow={() => {}}
      />,
    )

    const cells = queryBodyCells()
    expect(cells[0]).not.toHaveClass('dg-row-hover')
    expect(cells[1]).not.toHaveClass('dg-row-hover')
    expect(cells[2]).toHaveClass('dg-row-hover')
  })

  it('rowHoverable=false → 不加 dg-row-hover，且 hover 事件透传给用户回调', () => {
    const onHoverRow = vi.fn()
    const userMouseEnter = vi.fn()
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={0}
        onHoverRow={onHoverRow}
        rowHoverable={false}
        onRow={() => ({ onMouseEnter: userMouseEnter })}
      />,
    )

    const cells = queryBodyCells()
    // rowHoverable=false → 不加 dg-row-hover
    expect(cells[0]).not.toHaveClass('dg-row-hover')

    // mouseEnter：onHoverRow 不被调用（rowHoverable=false 时 mergeHoverEventHandler 走用户回调分支）
    fireEvent.mouseEnter(cells[0])
    expect(onHoverRow).not.toHaveBeenCalled()
    expect(userMouseEnter).toHaveBeenCalledTimes(1)
  })
})

describe('ColumnCells - data-known-size（实测闭环）', () => {
  it('colIdx===0 + effectiveRowHeight 提供时写 data-known-size', () => {
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        effectiveRowHeight={(index) => 40 + index}
      />,
    )

    const cells = queryBodyCells()
    expect(cells[0]).toHaveAttribute('data-known-size', '40')
    expect(cells[1]).toHaveAttribute('data-known-size', '41')
    expect(cells[2]).toHaveAttribute('data-known-size', '42')
  })

  it('colIdx>0 即使 effectiveRowHeight 提供也不写 data-known-size', () => {
    const column: EngineLeafColumn<Row> = { key: 'age', dataIndex: 'age', title: 'Age' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={2}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        effectiveRowHeight={(index) => 40 + index}
      />,
    )

    queryBodyCells().forEach((cell) => {
      expect(cell).not.toHaveAttribute('data-known-size')
    })
  })

  it('effectiveRowHeight 缺省时不写 data-known-size（即使 colIdx===0）', () => {
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    queryBodyCells().forEach((cell) => {
      expect(cell).not.toHaveAttribute('data-known-size')
    })
  })
})

describe('ColumnCells - data-column-key', () => {
  it('表头格 + 表体格都写 data-column-key', () => {
    const column: EngineLeafColumn<Row> = { key: 'age', dataIndex: 'age', title: 'Age' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={1}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveAttribute('data-column-key', 'age')
    queryBodyCells().forEach((cell) => {
      expect(cell).toHaveAttribute('data-column-key', 'age')
    })
  })

  it('表头格写 data-leaf-index（用于 ResizeObserver 测量标记）', () => {
    const column: EngineLeafColumn<Row> = { key: 'age', dataIndex: 'age', title: 'Age' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={3}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    expect(queryHeaderCells()[0]).toHaveAttribute('data-leaf-index', '3')
  })

  it('isLastLeaf=true → 表头格写 data-leaf-last（表头分隔线排除标记）', () => {
    const column: EngineLeafColumn<Row> = { key: 'age', dataIndex: 'age', title: 'Age' }
    const { rerender } = renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={2}
        isLastLeaf
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )
    expect(queryHeaderCells()[0]).toHaveAttribute('data-leaf-last')

    rerender(
      <ConfigProvider>
        <ColumnCells<Row>
          column={column}
          colIdx={2}
          isLastLeaf={false}
          dataSource={ds}
          rowKey="id"
          showHeader
          hoveredRowIndex={null}
          onHoverRow={() => {}}
        />
      </ConfigProvider>,
    )
    expect(queryHeaderCells()[0]).not.toHaveAttribute('data-leaf-last')
  })
})

describe('ColumnCells - flat 路径 onHeaderCell / onHeaderRow 合并', () => {
  it('onHeaderCell 注入 className/style 合并到表头格', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'age',
      title: 'Age',
      className: 'col-class',
      style: { color: 'red' },
      onHeaderCell: () => ({
        className: 'inject-class',
        style: { backgroundColor: 'yellow' },
      }),
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('col-class', 'inject-class')
    // jsdom 把命名颜色解析成 rgb；用 rgb 表达避免歧义
    expect(header).toHaveStyle({ color: 'rgb(255, 0, 0)', backgroundColor: 'rgb(255, 255, 0)' })
  })

  it('onHeaderRow 注入的 className/style 也合并到表头格', () => {
    const onHeaderRow = vi.fn((_columns, index) => ({
      className: `row-${index}`,
      style: { fontWeight: 700 },
    }))
    const headerColumns = [{ key: 'age' }]
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'age', dataIndex: 'age', title: 'Age' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        onHeaderRow={onHeaderRow as EngineTableProps<Row>['onHeaderRow']}
        headerColumns={headerColumns}
      />,
    )

    expect(onHeaderRow).toHaveBeenCalledWith(headerColumns, 0)
    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('row-0')
    expect(header).toHaveStyle({ fontWeight: '700' })
  })

  it('onHeaderCell 抛错时降级为不注入（不挂）', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'age',
      title: 'Age',
      onHeaderCell: () => {
        throw new Error('boom')
      },
    }
    expect(() =>
      renderWithProvider(
        <ColumnCells<Row>
          column={column}
          colIdx={0}
          dataSource={ds}
          rowKey="id"
          showHeader
          hoveredRowIndex={null}
          onHoverRow={() => {}}
        />,
      ),
    ).not.toThrow()
    // 表头格仍渲染（只是没有 inject props）
    expect(queryHeaderCells()).toHaveLength(1)
  })

  it('注入的非 onClick 事件 prop 透传到表头格', () => {
    const onDoubleClick = vi.fn()
    const column: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'age',
      title: 'Age',
      onHeaderCell: () => ({ onDoubleClick }),
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    fireEvent.doubleClick(queryHeaderCells()[0])
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })
})

describe('ColumnCells - ColumnResizer 集成', () => {
  it('resizeEnabled + resizeSiblingKey + onResizerPointerDown → 渲染 resizer；pointerdown 触发工厂返回的 handler', () => {
    const innerHandler = vi.fn()
    const onResizerPointerDown = vi.fn(() => innerHandler)
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        resizeEnabled
        resizeSiblingKey="age"
        onResizerPointerDown={onResizerPointerDown}
      />,
    )

    // resizer 渲染
    const header = queryHeaderCells()[0] as HTMLDivElement
    const resizer = within(header).getByRole('separator') as HTMLElement
    expect(resizer).toHaveClass('dg-resizer')
    expect(resizer).toHaveAttribute('data-column-key', 'name')
    // 工厂被调（columnKey, siblingKey）
    expect(onResizerPointerDown).toHaveBeenCalledWith('name', 'age')

    // pointerdown 触发工厂返回的内部 handler
    fireEvent.pointerDown(resizer)
    expect(innerHandler).toHaveBeenCalledTimes(1)
  })

  it('resizeEnabled 缺少 siblingKey 时不渲染 resizer', () => {
    const onResizerPointerDown = vi.fn(() => vi.fn())
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        resizeEnabled
        // 缺 resizeSiblingKey
        onResizerPointerDown={onResizerPointerDown}
      />,
    )

    expect(within(queryHeaderCells()[0] as HTMLDivElement).queryByRole('separator')).toBeNull()
    expect(onResizerPointerDown).not.toHaveBeenCalled()
  })

  it('resizingKey 命中当前列 → resizer 加 dg-resizer-active', () => {
    const onResizerPointerDown = vi.fn(() => vi.fn())
    const column: EngineLeafColumn<Row> = { key: 'name', dataIndex: 'name', title: 'Name' }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        resizeEnabled
        resizeSiblingKey="age"
        onResizerPointerDown={onResizerPointerDown}
        resizingKey="name"
      />,
    )

    const resizer = within(queryHeaderCells()[0] as HTMLDivElement).getByRole('separator')
    expect(resizer).toHaveClass('dg-resizer-active')
  })
})

describe('ColumnCells - sticky 样式', () => {
  it('fixed=start sticky 信息 → 表头 + 表体格 inline sticky left + dg-cell-fixed-start 类', () => {
    const sticky: LeafStickyInfo = { side: 'start', offset: 0, width: 100, isEdge: false }
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      title: 'Name',
      fixed: 'start',
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        sticky={sticky}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('dg-cell-fixed-start')
    expect(header).toHaveStyle({ position: 'sticky', left: '0px', zIndex: '3' })

    const body = queryBodyCells()[0]
    expect(body).toHaveClass('dg-cell-fixed-start')
    expect(body).toHaveStyle({ position: 'sticky', left: '0px', zIndex: '2' })
  })

  it('fixed=end sticky 信息 → sticky right + dg-cell-fixed-end 类', () => {
    const sticky: LeafStickyInfo = { side: 'end', offset: 0, width: 80, isEdge: false }
    const column: EngineLeafColumn<Row> = {
      key: 'action',
      dataIndex: 'id',
      title: 'Action',
      fixed: 'end',
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={2}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        sticky={sticky}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('dg-cell-fixed-end')
    expect(header).toHaveStyle({ position: 'sticky', right: '0px' })

    const body = queryBodyCells()[0]
    expect(body).toHaveClass('dg-cell-fixed-end')
    expect(body).toHaveStyle({ position: 'sticky', right: '0px' })
  })

  it('sticky.isEdge=true → 加边缘阴影类（start/end）', () => {
    const stickyStart: LeafStickyInfo = { side: 'start', offset: 0, width: 100, isEdge: true }
    const { unmount } = renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name', fixed: 'start' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        sticky={stickyStart}
      />,
    )
    expect(queryHeaderCells()[0]).toHaveClass('dg-sticky-shadow-start')
    unmount()

    const stickyEnd: LeafStickyInfo = { side: 'end', offset: 0, width: 80, isEdge: true }
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name', fixed: 'end' }}
        colIdx={2}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        sticky={stickyEnd}
      />,
    )
    expect(queryHeaderCells()[0]).toHaveClass('dg-sticky-shadow-end')
  })

  it('headerStickyTop=true → 表头格纵向 sticky top:0 + dg-cell-header-vsticky', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        headerStickyTop
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('dg-cell-header-vsticky')
    expect(header).toHaveStyle({ position: 'sticky', top: '0px', zIndex: '4' })
  })

  it('stickyHeaderOffset（页面级）→ 表头格 sticky top:offsetHeader', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        stickyHeaderOffset={20}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('dg-cell-header-vsticky')
    expect(header).toHaveStyle({ position: 'sticky', top: '20px', zIndex: '4' })
  })

  it('横向+纵向同时 sticky（corner cell）→ zIndex 升到 5', () => {
    const sticky: LeafStickyInfo = { side: 'start', offset: 0, width: 100, isEdge: false }
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name', fixed: 'start' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        sticky={sticky}
        headerStickyTop
      />,
    )

    expect(queryHeaderCells()[0]).toHaveStyle({ zIndex: '5' })
  })
})

describe('ColumnCells - ellipsis title 集成', () => {
  it('ellipsis=true + 文本 dataIndex 值 → 表体 cell-inner 加 native title', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      title: 'Name',
      ellipsis: true,
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const cells = queryBodyCells()
    expect(cells[0]).toHaveClass('dg-cell-ellipsis')
    const inner = cells[0].querySelector('.dg-cell-inner')
    expect(inner).toHaveAttribute('title', 'Ada')
    expect(cells[1].querySelector('.dg-cell-inner')).toHaveAttribute('title', 'Bob')
  })

  it('ellipsis=true + showTitle=false → cell-inner 无 title（让自定义 Tooltip 接管）', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      title: 'Name',
      ellipsis: true,
      showTitle: false,
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const inner = queryBodyCells()[0].querySelector('.dg-cell-inner')
    expect(inner).not.toHaveAttribute('title')
    // 但 ellipsis 类照常加
    expect(queryBodyCells()[0]).toHaveClass('dg-cell-ellipsis')
  })

  it('非 ellipsis 列 → cell-inner 无 title', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      title: 'Name',
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const inner = queryBodyCells()[0].querySelector('.dg-cell-inner')
    expect(inner).not.toHaveAttribute('title')
  })

  it('ellipsis=true 但 dataIndex 值为 number → title 字符串化为数字', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'age',
      dataIndex: 'age',
      title: 'Age',
      ellipsis: true,
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={1}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const cells = queryBodyCells()
    expect(cells[0].querySelector('.dg-cell-inner')).toHaveAttribute('title', '36')
    expect(cells[2].querySelector('.dg-cell-inner')).toHaveAttribute('title', '41')
  })

  it('表头 ellipsis=true + 文本 title → 表头格 title 为完整标题文案', () => {
    const column: EngineLeafColumn<Row> = {
      key: 'name',
      dataIndex: 'name',
      title: 'LongHeaderName',
      ellipsis: true,
    }
    renderWithProvider(
      <ColumnCells<Row>
        column={column}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('dg-cell-ellipsis')
    // ellipsis 列表头 title 优先用完整文案（不与排序提示冲突）
    expect(header).toHaveAttribute('title', 'LongHeaderName')
  })
})

describe('ColumnCells - 其他 props 派生', () => {
  it('column.align=center → data-align=center + textAlign=center', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'age', dataIndex: 'age', title: 'Age', align: 'center' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveAttribute('data-align', 'center')
    expect(header).toHaveStyle({ textAlign: 'center' })
    expect(queryBodyCells()[0]).toHaveAttribute('data-align', 'center')
  })

  it('column.hidden=true → 表头/表体格加 dg-cell-hidden', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name', hidden: true }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    expect(queryHeaderCells()[0]).toHaveClass('dg-cell-hidden')
    queryBodyCells().forEach((cell) => expect(cell).toHaveClass('dg-cell-hidden'))
  })

  it('filterable 列（filters 提供且 onFilter 函数）→ 表头加 dg-column-has-filter', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{
          key: 'name',
          dataIndex: 'name',
          title: 'Name',
          filters: [{ text: 'Ada', value: 'Ada' }],
          onFilter: () => true,
        }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        onFilterApply={() => {}}
      />,
    )

    expect(queryHeaderCells()[0]).toHaveClass('dg-column-has-filter')
  })

  it('isRowSelected 命中 → 表体格加 dg-row-selected', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        isRowSelected={(r) => r.id === 2}
      />,
    )

    const cells = queryBodyCells()
    expect(cells[0]).not.toHaveClass('dg-row-selected')
    expect(cells[1]).toHaveClass('dg-row-selected')
    expect(cells[2]).not.toHaveClass('dg-row-selected')
  })

  it('语义化 header.cell className/style 合并到表头格', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        semanticHeader={{
          className: { cell: 'sem-cell', row: 'sem-row' },
          style: { cell: { color: 'green' }, row: { border: '1px solid black' } },
        }}
      />,
    )

    const header = queryHeaderCells()[0]
    expect(header).toHaveClass('sem-cell', 'sem-row')
    // jsdom 把 'green' 解析成 rgb(0,128,0)；用 rgb 表达避免歧义
    expect(header).toHaveStyle({ color: 'rgb(0, 128, 0)' })
  })

  it('语义化 body.cell / body.row className 合并到表体格', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        semanticBody={{
          className: { cell: 'sem-body-cell', row: 'sem-body-row' },
        }}
      />,
    )

    const cells = queryBodyCells()
    cells.forEach((c) => {
      expect(c).toHaveClass('sem-body-cell', 'sem-body-row')
    })
  })

  it('rowClassName 字符串透传到表体格', () => {
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        rowClassName="my-row"
      />,
    )

    queryBodyCells().forEach((c) => expect(c).toHaveClass('my-row'))
  })

  it('rowClassName 函数按行 index 计算 → 每行不同 class', () => {
    const rowClassName = vi.fn((_record: Row, index: number) => `r${index}`)
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        rowClassName={rowClassName as EngineTableProps<Row>['rowClassName']}
      />,
    )

    const cells = queryBodyCells()
    expect(cells[0]).toHaveClass('r0')
    expect(cells[1]).toHaveClass('r1')
    expect(cells[2]).toHaveClass('r2')
    expect(rowClassName).toHaveBeenCalledTimes(ds.length)
  })

  it('rowKey 函数 → 取该函数返回值作 React key（验证调用）', () => {
    const rowKey = vi.fn((r: Row) => `k-${r.id}`)
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey={rowKey}
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
      />,
    )

    expect(rowKey).toHaveBeenCalled()
    // 渲染无报错即视为 key 注入正常（React key 不直接出现在 DOM attribute 上）
    expect(queryBodyCells()).toHaveLength(ds.length)
  })

  it('components.body.cell 提供时替换单元格内容渲染', () => {
    const CustomCell = ({ children, record, index }: { children: React.ReactNode; record: Row; index: number }) => (
      <span data-testid="custom">
        #{index}:{String(record.id)}:{String(children)}
      </span>
    )
    renderWithProvider(
      <ColumnCells<Row>
        column={{ key: 'name', dataIndex: 'name', title: 'Name' }}
        colIdx={0}
        dataSource={ds}
        rowKey="id"
        showHeader
        hoveredRowIndex={null}
        onHoverRow={() => {}}
        components={{ body: { cell: CustomCell } }}
      />,
    )

    const customs = screen.getAllByTestId('custom')
    expect(customs).toHaveLength(ds.length)
    expect(customs[0].textContent).toBe('#0:1:Ada')
  })
})
