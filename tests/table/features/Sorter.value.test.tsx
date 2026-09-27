// 黑盒 feature-slice 测试：排序域（Sorter.value），与 antd 自家用例逐条对齐。
//
// 对齐来源: G:\Projects\ant-design\components\table\__tests__\Sorter.value.test.tsx（2 个 it，全部直测）
//
// 用例数对账：antd 2 条 it = 本文件直测 2 + skip 0。
//
// 选择器重映射表（antd → data-grid；基准见 tmp/phase2-brief.md §3，本域实测补充）:
//   | antd | data-grid |
//   |---|---|
//   | `.ant-table-column-sorters`（点击目标） | 表头格本身：`.dg-cell-header` / `.dg-column-has-sorters` |
//   | `th` | `div.dg-cell.dg-cell-header` |
//   | `.ant-table-column-sorter-up` / `-down` 的 `.active` | `.dg-column-sorter-up` / `-down` 的 `dg-column-sorter-active` |
//
// 行为差异（src 实测）:
//   - data-grid 的排序点击绑在表头格本身（src/table/engine/HeaderCell.tsx:318-343），不是 `.dg-column-sorters`。
//   - onChange 第二参 `sorter` 形状：1 激活 → 单对象；>=2 激活 → 数组（按 multiple 升序）
//     （src/table/engine/sorterUtils.ts:161-183）。
//   - `showSorterTooltip={{ target: 'sorter-icon' }}` 被简化为原生 `title`（不影响点击行为）。
import { useState } from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'

import { Table } from '../../../src/table/index'
import { customRender } from '../../shared/render'

describe('Sorter.value.test.tsx', () => {
  // data-grid/antd 兼容层在列定义变化时可能打印告警；测试不消费 console.error。
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  afterAll(() => {
    errorSpy.mockRestore()
  })

  interface stateType {
    columns: Array<{
      title: string
      dataIndex: string
      sorter: {
        multiple: number
      }
    }>
    data: Array<{
      key: React.Key
      age?: number
      foo?: string
      name?: string
    }>
  }

  // 第二个用例把整个对象喂给 useState<stateType>，故保留 columns（两处均按 antd 原样）。
  const data = {
    columns: [
      { title: 'Age', dataIndex: 'age', sorter: { multiple: 2 } },
      { title: 'foo', dataIndex: 'foo', sorter: { multiple: 2 } },
    ],
    data: [
      { key: '1', age: 32, foo: 'foo' },
      { key: '2', age: 33, foo: 'bar' },
    ],
  }

  // antd L62：两次点击（不同列）后 onChange 的 sorter 必须是数组（多列）。
  it('should call onChange with correct sorter value when clicked', () => {
    const onChange = vi.fn()
    const TableSorter: React.FC = () => {
      const [tableData, setTableData] = useState(data.data)
      const columns = [
        { title: 'Age', dataIndex: 'age', sorter: { multiple: 2 } },
        { title: 'foo', dataIndex: 'foo', sorter: { multiple: 2 } },
      ]
      const handleClick = () => {
        setTableData([
          { key: '1', age: 22, foo: 'foo1' },
          { key: '2', age: 23, foo: 'foo2' },
          { key: '3', age: 12, foo: 'foo3' },
        ])
      }
      return (
        <>
          <Table
            columns={columns}
            dataSource={tableData}
            onChange={onChange}
            showSorterTooltip={{ target: 'sorter-icon' }}
          />
          <button type="button" className="change-column" onClick={handleClick}>
            resetData
          </button>
        </>
      )
    }
    const { container } = customRender(<TableSorter />)
    // 点击目标从 antd 的 `.ant-table-column-sorters` 重映射为 data-grid 的可排序表头格。
    fireEvent.click(container.querySelector('.dg-column-has-sorters')!)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        order: 'ascend',
        field: 'age',
      }),
      expect.anything(),
    )
    const columnSorters = container.querySelectorAll('.dg-column-has-sorters')
    const fooSorterHeader = columnSorters[1]
    fireEvent.click(fooSorterHeader)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          order: 'ascend',
          field: 'age',
        }),
        expect.objectContaining({
          order: 'ascend',
          field: 'foo',
        }),
      ]),
      expect.anything(),
    )
    const changeButton = container.querySelector('.change-column')
    fireEvent.click(changeButton!)
    const getNameColumn = () => container.querySelector('.dg-cell-header')
    expect(
      getNameColumn()
        ?.querySelector('.dg-column-sorter-up')
        ?.className.includes('dg-column-sorter-active'),
    ).toBeTruthy()
    fireEvent.click(container.querySelector('.dg-column-has-sorters')!)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          order: 'ascend',
          field: 'foo',
        }),
        expect.objectContaining({
          order: 'descend',
          field: 'age',
        }),
      ]),
      expect.anything(),
    )
    expect(
      getNameColumn()
        ?.querySelector('.dg-column-sorter-down')
        ?.className.includes('dg-column-sorter-active'),
    ).toBeTruthy()
  })

  // antd L171：列集合整体变化后，点击新列仍只报该列的 sorter（单对象）。
  it('onChange should be called with the correct sorter value when clicked when the column changes', () => {
    const onChange = vi.fn()
    const TableSorter: React.FC = () => {
      const [tableData, setTableData] = useState<stateType>(data)
      const handleClick = () => {
        setTableData({
          columns: [
            { title: 'name', dataIndex: 'name', sorter: { multiple: 2 } },
            { title: 'foo', dataIndex: 'foo', sorter: { multiple: 2 } },
          ],
          data: [
            { key: 'sxzz', name: 'sxzz', foo: 'foo' },
            { key: 'innei', name: 'innei', foo: 'bar' },
          ],
        })
      }
      return (
        <>
          <Table
            columns={tableData.columns}
            dataSource={tableData.data}
            onChange={onChange}
            showSorterTooltip={{ target: 'sorter-icon' }}
          />
          <button type="button" className="change-column" onClick={handleClick}>
            change11
          </button>
        </>
      )
    }
    const { container } = customRender(<TableSorter />)
    fireEvent.click(container.querySelector('.dg-column-has-sorters')!)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        order: 'ascend',
        field: 'age',
      }),
      expect.anything(),
    )
    const changeButton = container.querySelector('.change-column')
    fireEvent.click(changeButton!)
    const columnSorters = container.querySelectorAll('.dg-column-has-sorters')
    const fooSorterHeader = columnSorters[1]
    fireEvent.click(fooSorterHeader)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        order: 'ascend',
        field: 'foo',
      }),
      expect.anything(),
    )
  })
})
