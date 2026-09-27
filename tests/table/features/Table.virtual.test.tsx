// 黑盒 feature-slice 测试：与 antd 自家 Table.virtual 测试用例逐条对齐（antd-style 黑盒层）。
//
// 对齐来源: G:\Projects\ant-design\components\table\__tests__\Table.virtual.test.tsx
//   antd 6 个 it → 本文件对齐 6 条（直测 4 + skip 2），另加 7 条补充直测（data-grid 独有：滚动窗口/占位/
//   scrollTo/回收模式/scroll.x 正交/分页+筛选组合/无 scroll.y 降级）= 共 13 个 it。
//
// data-grid 不是 rc-virtual-list（无 `.ant-table-tbody-virtual*` / `.ant-table-row` / `components.body.row|cell`
// 的 antd 语义），故 antd 的选择器与结构断言全部按 data-grid 真实 DOM 重映射：
//
// 选择器重映射（依据 src/table/engine/GridTable.tsx:629-790、src/table/engine/ScrollContainer.tsx:330-336）:
//   - `.ant-table-tbody-virtual .ant-table-row`（rc-virtual-list 行）→ 无行元素；以
//     `.dg-cell-body[data-row-index="N"]` 取该行全部格（src/table/engine/BodyGrid.tsx:164-203）
//   - `.ant-table-tbody-virtual-holder`（虚拟滚动容器）→ `.dg-scroll.dg-virtual-scroll`
//   - 虚拟占位（rc-virtual-list 内部 padding）→ `.dg-filler-row.dg-filler-top` / `.dg-filler-bottom`
//   - `.ant-table-expanded-row` → `.dg-row-expanded`（src/table/engine/expandLayerUtils.tsx:46-58）
//   - `.ant-table-selection-col`（antd 选择列宽类）→ 不存在；选择列宽体现为 `.dg-grid` 的
//     grid-template-columns track（`minmax(50px, max-content)`，src/table/selectionAdapter.tsx:167-168）
//   - `.ant-table-row` 的 `display: flex` 断言 → 无对应（data-grid 行不是 flex 容器）
//
// 关键前置事实（读 src 确认，不猜）:
//   - `virtual` 只有与 `scroll.y === true` 同时成立才启用（src/table/engine/useScrollMode.ts:85）；
//     `scroll.y` 仅支持 `true`，不支持数字（src/table/publicTypes.ts:175）。
//   - jsdom 无布局：滚动容器 clientHeight/clientHeight 恒 0 → `computeVirtualRange` 走
//     `viewportSize <= 0` 分支，窗口 = min(itemCount, overscan*2+1) = 17 行
//     （src/table/engine/virtualListUtils.ts:123-126）。故只断言"窗口行数 > 0 且 < 总行数"，
//     不断言像素高度/位置。
//   - data-grid 默认每页 10 行（antd 默认 pageSize）；测虚拟窗口必须 `pagination={false}`。
import { createRef } from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { Table, type TableRef } from '../../../src/table/index'
import { customRender, renderWithConfig } from '../../shared/render'

const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

afterAll(() => {
  errSpy.mockRestore()
  warnSpy.mockRestore()
})

/** 生成 n 行数据（key = r0..r(n-1)）。 */
function makeData(n: number): Array<{ key: string }> {
  return Array.from({ length: n }, (_, i) => ({ key: `r${i}` }))
}

/** 取容器内数据行数（按 data-row-index 去重）。 */
function renderedRowIndexes(container: HTMLElement): Array<string> {
  const set = new Set<string>()
  container.querySelectorAll('.dg-cell-body').forEach((cell) => {
    const idx = (cell as HTMLElement).dataset.rowIndex
    if (idx !== undefined) set.add(idx)
  })
  return [...set]
}

/**
 * jsdom 无布局 → 给滚动容器装一次性的 clientHeight/scrollHeight/scrollTop 桩，
 * 让 useVirtualList.scrollTo 的 maxScrollTop 非 0，从而能观测到真实的 scrollTop 赋值。
 * 只作用于该元素，不影响其它组件。
 */
function stubScrollElement(el: HTMLElement, viewport = 400, total = 4000): Array<number> {
  const sets: Array<number> = []
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => viewport })
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => total })
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => 0,
    set: (v: number) => {
      sets.push(v)
    },
  })
  return sets
}

describe('Table.Virtual', () => {
  // antd L8：virtual + scroll（antd 用 { x: 100, y: 100 }）。
  // 重映射：data-grid 的 scroll.y 仅支持 true（src/table/publicTypes.ts:175），数字形态不启用虚拟
  // （useScrollMode.ts:85），故改传 y: true；断言改到 .dg-virtual-scroll + .dg-cell-body。
  it('should work', () => {
    const { container } = customRender(
      <Table
        virtual
        scroll={{ x: 100, y: true }}
        columns={[{ dataIndex: 'key' }]}
        dataSource={[{ key: 'bamboo' }]}
      />,
    )

    // 虚拟路径确实生效（antd: `.ant-table-wrapper .ant-table-tbody-virtual` 存在）。
    expect(container.querySelectorAll('.dg-virtual-scroll')).toHaveLength(1)
    // antd: `.ant-table-tbody-virtual-holder .ant-table-cell` 数量 1 + 文本 'bamboo'。
    const cells = container.querySelectorAll('.dg-cell-body')
    expect(cells).toHaveLength(1)
    expect(cells[0].textContent).toBe('bamboo')
  })

  // antd L32：`virtual` 且无 `scroll.y` 时报 rc-component/table 的 warning
  // （'Warning: `scroll.y` in virtual table must be number.'）。
  // skip 依据（实测 + src）：data-grid 不产生任何该 warning —— 全 src/table 仅 usePagination.ts:177 有
  // console.warn，虚拟路径无 warning；`useScrollMode.ts:85` 要求 `scroll.y === true` 才启用虚拟，
  // 缺失时**静默降级为非虚拟**。该 antd 断言的"警告"行为在 data-grid 不存在，无法直测；
  // 真实降级行为由下方补充用例 'degrades to non-virtual when scroll.y is absent' 覆盖。
  it.skip('warning if no scroll', () => {
    // 占位：data-grid 无 rc-virtual-list 的 scroll.y 类型警告（见上方依据）。
  })

  // antd L40：virtual + components.body.row/cell（EditableRow/EditableCell）。
  // 重映射：data-grid **消费** components.body.row（每行包裹层）与 components.body.cell
  // （替换单元格内容，src/table/nativeOptions.ts:99-123、engine/cellRenderUtils.tsx:52、
  // engine/BodyGrid.tsx:333-438）。antd 断言目标是 rc-virtual-list DOM（`.ant-table-tbody-virtual*`）
  // 与行元素 `display: flex`，data-grid 无这些节点，故重映射为：包裹层存在 + 自定义单元格内容渲染 +
  // 数据格仍保持 grid 定位（.dg-cell-body + data-row-index/data-column-key/grid-column）。
  it('should work with edit cell', () => {
    const EditableRow = ({ children }: React.PropsWithChildren) => (
      <div className="editable-row">{children}</div>
    )
    const EditableCell = ({ children }: React.PropsWithChildren) => (
      <div className="editable-cell">{children}</div>
    )

    const { container } = customRender(
      <Table
        virtual
        components={{ body: { row: EditableRow, cell: EditableCell } }}
        scroll={{ y: true }}
        columns={[{ dataIndex: 'key' }]}
        dataSource={[{ key: 'bamboo' }]}
      />,
    )

    expect(container.querySelectorAll('.dg-virtual-scroll')).toHaveLength(1)
    // body.row：每行一个包裹层。
    expect(container.querySelectorAll('.editable-row')).toHaveLength(1)
    // body.cell：替换单元格内容（antd 替换整个 td；data-grid 替换 .dg-cell-inner 内容）。
    const customCells = container.querySelectorAll('.editable-cell')
    expect(customCells).toHaveLength(1)
    expect(customCells[0].textContent).toBe('bamboo')
    // 单元格本身仍是 grid item，定位属性未被自定义组件破坏。
    const cell = container.querySelector('.dg-cell-body') as HTMLElement
    expect(cell).toBeTruthy()
    expect(cell.dataset.rowIndex).toBe('0')
    expect(cell.dataset.columnKey).toBe('key')
    expect(cell.style.gridColumn).toBe('1')
  })

  // antd L80：virtual + 展开行内嵌套子表格。
  // 重映射：`.ant-table-tbody-virtual-holder-inner > div > .ant-table-row` → 数据行 0 的数据格；
  // `.ant-table-expanded-row` → `.dg-row-expanded`；嵌套 `.ant-table-row` 的 display 断言 →
  // 嵌套 grid 的数据格数量 + 文本。
  it('should work with sub table', () => {
    const expandedRowRender = () => (
      <Table
        columns={[
          { title: 'Date', dataIndex: 'date', key: 'date' },
          { title: 'Name', dataIndex: 'name', key: 'name' },
        ]}
        dataSource={[
          { key: '0', date: 'd0', name: 'n0' },
          { key: '1', date: 'd1', name: 'n1' },
          { key: '2', date: 'd2', name: 'n2' },
        ]}
        pagination={false}
      />
    )

    const { container } = customRender(
      <Table
        columns={[{ dataIndex: 'key' }]}
        expandable={{ expandedRowRender, defaultExpandedRowKeys: ['0'] }}
        dataSource={[{ key: '0' }]}
        size="medium"
        virtual
        scroll={{ y: true }}
      />,
    )

    // 外层虚拟路径生效，且数据行 0 只渲染一次。
    expect(container.querySelectorAll('.dg-virtual-scroll')).toHaveLength(1)
    expect(renderedRowIndexes(container)).toContain('0')

    const outerDataCells = container.querySelectorAll(
      '.dg-cell-body[data-row-index="0"][data-column-key="key"]',
    )
    expect(outerDataCells).toHaveLength(1)
    expect(outerDataCells[0].textContent).toBe('0')

    // antd: 展开行存在（1 条）。
    const expandedRows = container.querySelectorAll('.dg-row-expanded')
    expect(expandedRows).toHaveLength(1)

    // 嵌套子表格渲染（2 列 × 3 行 = 6 格）。
    const nestedCells = expandedRows[0].querySelectorAll('.dg-cell-body')
    expect(nestedCells).toHaveLength(6)
    expect(
      Array.from(nestedCells)
        .map((cell) => cell.textContent)
        .slice(0, 2),
    ).toEqual(['d0', 'n0'])
  })

  // antd L130：ConfigProvider 组件 token `Table.selectionColumnWidth` 决定选择列宽。
  // skip 依据：data-grid 只消费 ConfigProvider 的 locale（src/table/Table.tsx:289-298，无 useToken /
  // theme components 读取）；实测在 <ConfigProvider theme={{components:{Table:{selectionColumnWidth:200}}}}>
  // 下 `.dg-wrapper` 的 `--ant-table-selection-column-width` 仍为 32px（tokenBridge.ts:131 由 controlHeight
  // 派生，不读用户覆盖），选择列 track 也不含 200px；且 data-grid 无 `.ant-table-selection-col` 元素。
  // 见 docs/pages/known-limitations（ConfigProvider 组件 token）。
  it.skip('should support columnWidth from token', () => {
    // 占位：ConfigProvider 组件级 token 不参与选择列宽（见上方依据）。
  })

  // antd L153：自定义 `rowSelection.columnWidth` 优先于 token（token: 200 → 自定义 50）。
  // 重映射：antd 断言 `.ant-table-selection-col` width:50px → data-grid 无该类，
  // 选择列宽体现在 `.dg-grid` 的 grid-template-columns track（src/table/selectionAdapter.tsx:167-168）。
  // 注：data-grid 不消费 theme token（见上方 skip 依据），故"优先于 token"在 data-grid 退化为
  // "自定义宽度生效且 token 不产生任何影响"——本用例直测该可观测事实。
  it('should support custom columnWidth priority over token', () => {
    const { container } = renderWithConfig(
      <Table
        columns={[{ dataIndex: 'key' }]}
        dataSource={[{ key: '0' }]}
        virtual
        scroll={{ y: true }}
        rowSelection={{ columnWidth: 50 }}
      />,
      { theme: { components: { Table: { selectionColumnWidth: 200 } } } },
    )

    // scroll.y 数据区域模式下列宽走定值 track（实测 '50px minmax(0, 1fr)'）。
    const grid = container.querySelector('.dg-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns.startsWith('50px')).toBe(true)
    // token 值 200 不得出现在列轨里（data-grid 不消费该 token）。
    expect(grid.style.gridTemplateColumns).not.toContain('200px')
    // 选择列的数据格存在且定位为第一列。
    const selectionCell = container.querySelector(
      '.dg-cell-body[data-column-key="__dg_selection__"]',
    ) as HTMLElement
    expect(selectionCell).toBeTruthy()
    expect(selectionCell.style.gridColumn).toBe('1')
  })

  // === 补充直测（antd 无滚动模拟；覆盖 data-grid 虚拟化的真实行为）===

  // 补充 1：virtual + scroll.y=true 只渲染视口窗口内的行（jsdom 视口为 0 → overscan*2+1 = 17 行），
  // 与非虚拟（渲染全部 100 行）形成对照。
  it('renders only viewport rows when virtual is enabled', () => {
    const props = {
      scroll: { y: true as const },
      // `false` 需按字面量收窄：`pagination` 的类型是 `false | TablePaginationConfig | undefined`
      // （src/table/publicTypes.ts:356），对象字面量里裸写 `false` 会拓宽成 `boolean`。
      pagination: false as const,
      gridOptions: { rowHeight: 40 },
      columns: [{ dataIndex: 'key' }],
      dataSource: makeData(100),
    }

    const virtual = customRender(<Table {...props} virtual />)
    const virtualRows = renderedRowIndexes(virtual.container)

    const plain = customRender(<Table {...props} />)
    const plainRows = renderedRowIndexes(plain.container)

    expect(virtualRows.length).toBeGreaterThan(0)
    expect(virtualRows.length).toBeLessThan(100)
    // 窗口从首行开始（scrollTop 恒 0）。
    expect(virtualRows).toContain('0')
    // 非虚拟渲染全部行，作为"窗口确实在裁剪"的对照。
    expect(plainRows).toHaveLength(100)
  })

  // 补充 2：滚动容器带虚拟类 + 上下占位 row 存在（占位高度只断言"存在且非 0"，不断言像素）。
  it('mounts virtual scroll container with filler placeholders', () => {
    const { container } = customRender(
      <Table
        virtual
        scroll={{ y: true }}
        pagination={false}
        gridOptions={{ rowHeight: 40 }}
        columns={[{ dataIndex: 'key' }]}
        dataSource={makeData(100)}
      />,
    )

    const scroll = container.querySelector('.dg-scroll')
    expect(scroll).toBeTruthy()
    expect(scroll!.classList.contains('dg-virtual-scroll')).toBe(true)

    const fillers = container.querySelectorAll('.dg-filler-row')
    expect(fillers).toHaveLength(2)
    expect(container.querySelector('.dg-filler-top')).toBeTruthy()
    expect(container.querySelector('.dg-filler-bottom')).toBeTruthy()
    // 底部占位 = 总高 - 已渲染部分（窗口内行数少，故 > 0）。
    const bottomHeight = Number.parseFloat(
      (container.querySelector('.dg-filler-bottom') as HTMLElement).style.height,
    )
    expect(bottomHeight).toBeGreaterThan(0)
  })

  // 补充 3：TableRef.scrollTo 仅在虚拟模式生效（src/table/engine/GridTable.tsx:489、buildTableRefHandle.ts:46）。
  // jsdom 无布局 → 用元素级桩给滚动容器非 0 的 clientHeight/scrollHeight，观测真实 scrollTop 赋值。
  it('scrollTo works only in virtual mode', () => {
    const virtualRef = createRef<TableRef>()
    const virtualRender = customRender(
      <Table
        ref={virtualRef}
        virtual
        scroll={{ y: true }}
        pagination={false}
        gridOptions={{ rowHeight: 40 }}
        columns={[{ dataIndex: 'key' }]}
        dataSource={makeData(100)}
      />,
    )
    const virtualSets = stubScrollElement(
      virtualRender.container.querySelector('.dg-virtual-scroll') as HTMLElement,
    )
    virtualRef.current?.scrollTo({ top: 300 })
    expect(virtualSets).toEqual([300])
    // key → index 映射：r10 是第 10 行，rowHeight 40 → 目标 400。
    virtualRef.current?.scrollTo({ key: 'r10' })
    expect(virtualSets).toEqual([300, 400])
    // 不存在的 key 不产生滚动。
    virtualRef.current?.scrollTo({ key: 'missing' })
    expect(virtualSets).toEqual([300, 400])

    const plainRef = createRef<TableRef>()
    const plainRender = customRender(
      <Table
        ref={plainRef}
        scroll={{ y: true }}
        pagination={false}
        gridOptions={{ rowHeight: 40 }}
        columns={[{ dataIndex: 'key' }]}
        dataSource={makeData(100)}
      />,
    )
    const plainScroll = plainRender.container.querySelector('.dg-scroll') as HTMLElement
    const plainSets = stubScrollElement(plainScroll)
    plainRef.current?.scrollTo({ top: 300 })
    // 非虚拟模式 no-op（容器内固定表头模式，src/table/buildTableRefHandle.ts:47）。
    expect(plainSets).toEqual([])
    expect(plainScroll.classList.contains('dg-virtual-scroll')).toBe(false)
    expect(plainScroll.classList.contains('dg-fixed-header-scroll')).toBe(true)
  })

  // 补充 4：virtualizationMode: 'recycling' 走 DOM 复用路径，窗口渲染不崩且内容正确
  // （src/table/engine/RecyclingBodyGrid.tsx:676-933）。
  it('supports virtualizationMode recycling', () => {
    const { container } = customRender(
      <Table
        virtual
        scroll={{ y: true }}
        pagination={false}
        gridOptions={{ rowHeight: 40, virtualizationMode: 'recycling' }}
        columns={[{ dataIndex: 'key' }]}
        dataSource={makeData(100)}
      />,
    )

    const cells = Array.from(container.querySelectorAll('.dg-cell-body'))
    expect(cells.length).toBeGreaterThan(0)
    expect(cells.length).toBeLessThan(100)
    expect(cells[0].textContent).toBe('r0')
    expect(container.querySelectorAll('.dg-filler-row')).toHaveLength(2)
  })

  // 补充 5：virtual + scroll.x 正交（同时开启不崩、列仍渲染、行窗口仍受限）。
  it('supports virtual combined with scroll.x', () => {
    const { container } = customRender(
      <Table
        virtual
        scroll={{ x: 400, y: true }}
        pagination={false}
        gridOptions={{ rowHeight: 40 }}
        columns={[
          { dataIndex: 'a', width: 200 },
          { dataIndex: 'b', width: 200 },
        ]}
        dataSource={Array.from({ length: 100 }, (_, i) => ({
          key: `r${i}`,
          a: `a${i}`,
          b: `b${i}`,
        }))}
      />,
    )

    const rowIndexes = renderedRowIndexes(container)
    expect(rowIndexes.length).toBeGreaterThan(0)
    expect(rowIndexes.length).toBeLessThan(100)

    // 每行两列都在（标题列 + 数据列均已挂到行上）。
    const row0Keys = Array.from(
      container.querySelectorAll('.dg-cell-body[data-row-index="0"]'),
    ).map((cell) => cell.getAttribute('data-column-key'))
    expect(row0Keys).toEqual(['a', 'b'])
    // 横向两列轨道存在（每列一条 minmax track）。
    const grid = container.querySelector('.dg-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns.match(/minmax\(/g)).toHaveLength(2)
    // 横向滚动容器类照常（scroll.x 不影响虚拟容器选择）。
    expect(container.querySelector('.dg-virtual-scroll')).toBeTruthy()
  })

  // 补充 6：virtual + 分页 + 筛选组合（分页切片后的数据上仍走虚拟窗口，筛选触发器正常渲染）。
  it('supports virtual combined with pagination and filter', () => {
    const { container } = customRender(
      <Table
        virtual
        scroll={{ y: true }}
        pagination={{ pageSize: 5 }}
        gridOptions={{ rowHeight: 40 }}
        columns={[
          {
            dataIndex: 'key',
            filters: [{ text: 'r1', value: 'r1' }],
            onFilter: (value: unknown, record: { key: string }) => record.key === value,
          },
        ]}
        dataSource={makeData(30)}
      />,
    )

    // 只渲染当前页 5 行。
    expect(renderedRowIndexes(container)).toHaveLength(5)
    expect(container.querySelectorAll('.dg-filter-trigger')).toHaveLength(1)
    // 分页器渲染且位置为默认 end（data-grid Pagination 为 antd 组件，类名保留）。
    expect(container.querySelectorAll('.dg-pagination')).toHaveLength(1)
    expect(container.querySelector('.dg-pagination .ant-pagination')).toBeTruthy()
  })

  // 补充 7：缺 scroll.y 时 virtual 静默降级为非虚拟（对应上方 skip 的 antd 用例的真实行为）：
  // 无虚拟容器类、无占位 row、全部行照常渲染，且不产生 scroll.y 相关报错。
  it('degrades to non-virtual when scroll.y is absent', () => {
    errSpy.mockClear()
    const { container } = customRender(
      <Table
        virtual
        pagination={false}
        gridOptions={{ rowHeight: 40 }}
        columns={[{ dataIndex: 'key' }]}
        dataSource={makeData(12)}
      />,
    )

    expect(container.querySelectorAll('.dg-virtual-scroll')).toHaveLength(0)
    expect(container.querySelectorAll('.dg-filler-row')).toHaveLength(0)
    // 全部 12 行都渲染（非虚拟路径）。
    expect(renderedRowIndexes(container)).toHaveLength(12)
    // 无 rc-component/table 的 scroll.y 类型警告（data-grid 虚拟路径无 console.warn/error）。
    expect(errSpy.mock.calls.flat().join(' ')).not.toMatch(/scroll\.y/i)
    expect(warnSpy.mock.calls.flat().join(' ')).not.toMatch(/scroll\.y/i)
  })
})
