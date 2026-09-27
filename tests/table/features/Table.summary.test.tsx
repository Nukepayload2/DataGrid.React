// 黑盒 feature-slice 测试：汇总（summary）域 —— data-grid 差异化能力。
//
// 对齐来源: antd 无同名源文件（`components/table/__tests__/` 下无 summary 专测）；
//   本文件按 plan 规定的 8 条用例实施，覆盖 antd `Table.Summary` 语义 + data-grid 的
//   virtual × summary 共存差异化（antd #47184：virtual 下 summary 失效；data-grid 用独立
//   grid item 渲染汇总行，不进虚拟窗口，故不失效）。
//
// 选择器重映射（data-grid 无语义化 table DOM，summary 不是 `<tfoot><tr><td>`）:
//   - antd `tfoot.ant-table-summary` / `tr.ant-table-summary` → 无容器元素；
//     汇总格 = `div.dg-cell.dg-cell-summary`（src/table/engine/Summary.tsx:223-233，带
//     `ant-table-cell` 别名 + `.dg-cell-inner` 内容层）
//   - antd `td` 的 `colspan` 属性 → inline `gridColumn: <index+1> / span <colSpan>`
//     （src/table/engine/Summary.tsx:178-180）
//   - antd 行定位（tfoot 自动排在表体后）→ inline `gridRow`（引擎 cloneElement 注入 __rowLine；
//     src/table/engine/SummaryLayer.tsx:28-37 + src/table/engine/GridTable.tsx:791-797）
//   - antd `fixed` 的 `position: sticky; bottom: 0` → 同名 inline style（Summary.tsx:183-189）
//   - 固定列汇总格 → 横向 sticky left/right + z-index 2（Summary.tsx:196-221）
//
// src 依据: src/table/engine/Summary.tsx、src/table/engine/SummaryLayer.tsx、
//   src/table/Table.tsx:715-727（summary 函数收到 pagedDataSource = 当前页数据）、
//   src/table/engine/GridTable.tsx:248-259 / 791-797（summary 存在即强制 multi 路径并渲染在
//   grid 末尾）、src/table/engine/useScrollMode.ts:83-85（virtual 需 virtual + scroll.y===true）。
//
// 直测 8 条 / skip 0 条。
import { describe, expect, it } from 'vitest'
import { fireEvent } from '@testing-library/react'

import { Table, type TableProps } from '../../../src/table/index'
import { customRender } from '../../shared/render'

interface RecordType {
  key: string
  name: string
  age: number
  address: string
}

const columns: TableProps<RecordType>['columns'] = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 120 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address', width: 160 },
]

const data: RecordType[] = [
  { key: '1', name: 'alpha', age: 10, address: 'A' },
  { key: '2', name: 'bravo', age: 20, address: 'B' },
  { key: '3', name: 'charlie', age: 30, address: 'C' },
  { key: '4', name: 'delta', age: 40, address: 'D' },
  { key: '5', name: 'echo', age: 50, address: 'E' },
]

function summaryCells(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.dg-cell-summary'))
}

describe('Table summary', () => {
  // 基础渲染：Table.Summary / .Row / .Cell 三段组合 → 每个 Cell 一个 grid item。
  // antd 侧对应 `<Table.Summary><Table.Summary.Row><Table.Summary.Cell/></...>`（`tfoot>tr>td`）。
  it('renders summary rows and cells as grid items', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
              <Table.Summary.Cell index={1}>{155}</Table.Summary.Cell>
              <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />,
    )

    const cells = summaryCells(container)
    expect(cells).toHaveLength(3)
    // 每个汇总格按 index 落到对应列轨道（index+1 起始线 / span 1）。
    expect(cells[0]).toHaveStyle({ gridColumn: '1 / span 1' })
    expect(cells[1]).toHaveStyle({ gridColumn: '2 / span 1' })
    expect(cells[2]).toHaveStyle({ gridColumn: '3 / span 1' })
    // 文本落在 .dg-cell-inner 内容层；汇总格与表体同处一个 .dg-grid（同一滚动容器）。
    expect(cells[0].querySelector('.dg-cell-inner')).toHaveTextContent('Total')
    expect(cells[1].querySelector('.dg-cell-inner')).toHaveTextContent('155')
    const grid = container.querySelector('.dg-grid')!
    expect(grid.querySelectorAll('.dg-cell-summary')).toHaveLength(3)
    expect(grid.querySelectorAll('.dg-cell-body').length).toBeGreaterThan(0)
    // 汇总区排在表体行之后（grid-row 线号 > 任意表体行线号）。
    expect(Number(cells[0].style.gridRow)).toBeGreaterThan(5)
  })

  // colSpan 跨列：data-grid 用 gridColumn span（antd 用 `<td colspan>`），另带 align → data-align + 修饰类。
  it('spans columns via colSpan and applies align', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        summary={
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2} align="end">
                spans two
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        }
      />,
    )

    const cells = summaryCells(container)
    expect(cells).toHaveLength(2)
    expect(cells[0]).toHaveStyle({ gridColumn: '1 / span 1' })
    const spanned = cells[1]
    expect(spanned).toHaveStyle({ gridColumn: '2 / span 2' })
    expect(spanned).toHaveAttribute('data-align', 'end')
    expect(spanned).toHaveClass('dg-cell-summary-end')
    expect(spanned).toHaveTextContent('spans two')
  })

  // summary 函数语义：收到的是**当前页**数据（src/table/Table.tsx:721-727 传 pagedDataSource），
  // 分页开启时只含当前页记录，而非全量 dataSource。
  it('passes the current page records to the summary function', () => {
    const seen: Array<Array<RecordType>> = []
    customRender(
      <Table
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 2 }}
        summary={(pageData) => {
          seen.push(pageData as RecordType[])
          return (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>{pageData.length} rows</Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />,
    )

    expect(seen.length).toBeGreaterThan(0)
    const last = seen[seen.length - 1]
    // 全量 5 条、pageSize 2 → 当前页 2 条（前两条）。
    expect(last).toHaveLength(2)
    expect(last.map((r) => r.key)).toEqual(['1', '2'])
  })

  // summary + 分页组合：切页后 pageData 变化，汇总内容随之更新。
  it('recomputes summary after pagination changes', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 2 }}
        summary={(pageData) => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                {(pageData as RecordType[]).map((r) => r.name).join(',')}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />,
    )

    expect(summaryCells(container)[0]).toHaveTextContent('alpha,bravo')

    fireEvent.click(container.querySelector('.ant-pagination-item-2') as HTMLElement)

    expect(summaryCells(container)[0]).toHaveTextContent('charlie,delta')
  })

  // summary + 筛选组合：汇总基于**筛选后**的结果（未分页时 pagedDataSource = filteredDataSource）。
  it('computes summary from the filtered records', () => {
    const filterColumns: TableProps<RecordType>['columns'] = [
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        filters: [{ text: 'alpha', value: 'alpha' }],
        onFilter: (value, record) => (record as RecordType).name === value,
        defaultFilteredValue: ['alpha'],
      },
      { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
      { title: 'Address', dataIndex: 'address', key: 'address', width: 160 },
    ]

    const { container } = customRender(
      <Table
        columns={filterColumns}
        dataSource={data}
        pagination={false}
        summary={(pageData) => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                {(pageData as RecordType[]).map((r) => r.name).join(',')}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                {(pageData as RecordType[]).reduce((sum, r) => sum + r.age, 0)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>{pageData.length}</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />,
    )

    // 筛选后仅剩 1 行（alpha / age 10）——表体与汇总同源。
    expect(container.querySelectorAll('.dg-cell-body[data-column-key="name"]')).toHaveLength(1)
    const cells = summaryCells(container)
    expect(cells[0]).toHaveTextContent('alpha')
    expect(cells[1]).toHaveTextContent('10')
    expect(cells[2]).toHaveTextContent('1')
  })

  // `Table.Summary fixed` → sticky bottom（钉底）；非 fixed 无 sticky。
  // 固定列汇总格另叠加横向 sticky（left + z-index 2），与表体固定列同 z 级。
  it('applies sticky bottom for fixed summary and horizontal sticky for fixed columns', () => {
    const fixedColumns: TableProps<RecordType>['columns'] = [
      { title: 'Name', dataIndex: 'name', key: 'name', width: 120, fixed: 'start' },
      { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
      { title: 'Address', dataIndex: 'address', key: 'address', width: 160 },
    ]

    const makeSummary = (fixed: boolean) => (
      <Table.Summary fixed={fixed}>
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
          <Table.Summary.Cell index={1} colSpan={2}>
            rest
          </Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    )

    const { container, rerender } = customRender(
      <Table
        columns={fixedColumns}
        dataSource={data}
        scroll={{ x: 360 }}
        pagination={false}
        summary={makeSummary(true)}
      />,
    )

    const fixedCell = summaryCells(container)[0]
    expect(fixedCell).toHaveStyle({ position: 'sticky', bottom: '0px', left: '0px', zIndex: '2' })
    // 汇总格与表体格同处一个 grid（同一滚动容器），排在表体之后。
    expect(container.querySelector('.dg-grid')!.contains(fixedCell)).toBe(true)

    rerender(
      <Table
        columns={fixedColumns}
        dataSource={data}
        scroll={{ x: 360 }}
        pagination={false}
        summary={makeSummary(false)}
      />,
    )

    // 非 fixed：无纵向钉底（bottom 清空）。position 仍为 sticky——那来自固定列的**横向** sticky
    //   （left: 0 / z-index 2），与 fixed 标志无关（Summary.tsx:196-221）。
    const plainCell = summaryCells(container)[0]
    expect(plainCell.style.bottom).toBe('')
    expect(plainCell).toHaveStyle({ position: 'sticky', left: '0px', zIndex: '2' })
  })

  // data-grid 差异化：virtual + summary 共存。
  // 汇总行是独立 grid item（SummaryLayer 渲染在 grid 末尾），不进虚拟窗口，故不随窗口消失；
  // antd 的 rc-virtual-list 把 `<tfoot>` 甩出虚拟视口（#47184）→ 需 fixed workaround。
  it('keeps summary outside the virtual window when combined with virtual scrolling', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={data}
        virtual
        scroll={{ y: true }}
        pagination={false}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>VTotal</Table.Summary.Cell>
              <Table.Summary.Cell index={1} colSpan={2}>
                rows
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />,
    )

    const cells = summaryCells(container)
    expect(cells).toHaveLength(2)
    expect(cells[0]).toHaveTextContent('VTotal')
    // 汇总格不是表体格（虚拟窗口只覆盖表体行），且排在所有表体行线号之后。
    expect(cells[0]).toHaveClass('dg-cell-summary')
    expect(cells[0]).not.toHaveClass('dg-cell-body')
    const bodyLines = Array.from(container.querySelectorAll<HTMLElement>('.dg-cell-body'))
      .map((cell) => Number(cell.style.gridRow))
      .filter((line) => Number.isFinite(line))
    expect(bodyLines.length).toBeGreaterThan(0)
    expect(Number(cells[0].style.gridRow)).toBeGreaterThan(Math.max(...bodyLines))
  })

  // 空数据时汇总行仍渲染（实测行为：summary 存在即强制 multi 路径并渲染到 grid 末尾，
  // 空态与汇总行互不抑制；空态区见 .dg-empty）。
  it('renders summary row for empty data', () => {
    const { container } = customRender(
      <Table
        columns={columns}
        dataSource={[]}
        pagination={false}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>EmptyTotal</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />,
    )

    expect(container.querySelector('.dg-empty')).toBeTruthy()
    const cells = summaryCells(container)
    expect(cells).toHaveLength(1)
    expect(cells[0]).toHaveTextContent('EmptyTotal')
    // 表头 1 行 + 0 表体行 → 汇总行落在第 2 条 grid-row 线。
    expect(cells[0]).toHaveStyle({ gridRow: '2' })
    expect(container.querySelectorAll('.dg-cell-body')).toHaveLength(0)
  })
})
