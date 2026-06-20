/**
 * 复刻 antd row-selection-custom demo：
 * `G:\Projects\ant-design\components\table\demo\row-selection-custom.tsx`。
 *
 * === antd demo 要素（S9 自研任务）===
 *
 * - `rowSelection.selectedRowKeys` 受控（外部 useState 驱动）。
 * - `rowSelection.selections`：自定义选择项数组（含 3 个内置哨兵 + 2 个自定义项 odd/even）：
 *     * `Table.SELECTION_ALL`：全选（引擎内置——选中所有可选行）。
 *     * `Table.SELECTION_INVERT`：反选（引擎内置——可选行中未选→选、已选→清）。
 *     * `Table.SELECTION_NONE`：清空（引擎内置——清空所有可选行）。
 *     * `{ key:'odd', text:'Select Odd Row', onSelect(changeableRowKeys) }`：自定义——
 *       过滤 changeableRowKeys 的偶数 index（antd demo 的 odd 命名如此：`index % 2 !== 0` 返回 false），
 *       demo 内 `setSelectedRowKeys(newSelectedRowKeys)`。
 *     * `{ key:'even', text:'Select Even Row', onSelect(changeableRowKeys) }`：自定义——
 *       过滤 changeableRowKeys 的奇数 index，demo 内 `setSelectedRowKeys`。
 * - 表头选择列的全选 checkbox 旁渲染一个下拉箭头，点开显示 selections 菜单。
 * - `onChange` console.log（与 antd demo 一致）。
 * - 数据：46 行（Edward King 0..45，age 32，address `London, Park Lane no. i`）。
 * - columns：Name/Age/Address（纯文本，无 render）。
 *
 * === 与 antd demo 的差异 ===
 *
 * - 基本逐字复刻（数据/列/selections 数组/onSelect 逻辑一致）。
 * - 额外在页面下方展示 selectedRowKeys（便于无 console 环境验证；antd demo 仅 console.log）。
 *
 * === 验证点（S9）===
 *
 * 1. 表头全选 checkbox 旁有下拉箭头（caret-down）。
 * 2. 点箭头 → 弹出菜单，列出 5 项（Select All / Select Invert / Select None / Select Odd Row / Select Even Row）。
 * 3. 点 Select All → 所有 46 行全选；点 Select None → 全清；点 Select Invert → 反选。
 * 4. 点 Select Odd Row → 选中 index 0,2,4,...（changeableRowKeys 中偶数 index，即 key 0,2,4...）；
 *    点 Select Even Row → 选中 index 1,3,5,...（key 1,3,5...）。
 * 5. onChange 触发 console.log（内置项触发；自定义项 demo 内自行 setState 不走 onChange）。
 * 6. 回归：row-selection / row-selection-and-operation demo 表头无下拉箭头（无 selections）。
 */

import { useState } from 'react'
import { Table } from '../table'
import type { ColumnType, SelectionItem, TableRowSelection } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

const dataSource = Array.from({ length: 46 }).map<DataType>((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}))

export default function RowSelectionCustomDemo() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])

  const onSelectChange = (newSelectedRowKeys: Array<React.Key>) => {
    // eslint-disable-next-line no-console
    console.log('selectedRowKeys changed: ', newSelectedRowKeys)
    setSelectedRowKeys(newSelectedRowKeys)
  }

  // 与 antd demo 逐字一致的 selections 数组（3 内置 + odd/even 自定义）。
  // 显式标注 SelectionItem[] 以让 onSelect(changeableRowKeys) 获得上下文类型。
  const selections: Array<SelectionItem> = [
    Table.SELECTION_ALL,
    Table.SELECTION_INVERT,
    Table.SELECTION_NONE,
    {
      key: 'odd',
      text: 'Select Odd Row',
      onSelect: (changeableRowKeys) => {
        // antd demo 原样：filter index % 2 !== 0 → false（保留偶数 index 项）。
        const newSelectedRowKeys = changeableRowKeys.filter((_, index) => {
          if (index % 2 !== 0) {
            return false
          }
          return true
        })
        setSelectedRowKeys(newSelectedRowKeys)
      },
    },
    {
      key: 'even',
      text: 'Select Even Row',
      onSelect: (changeableRowKeys) => {
        // antd demo 原样：filter index % 2 !== 0 → true（保留奇数 index 项）。
        const newSelectedRowKeys = changeableRowKeys.filter((_, index) => {
          if (index % 2 !== 0) {
            return true
          }
          return false
        })
        setSelectedRowKeys(newSelectedRowKeys)
      },
    },
  ]
  const rowSelection: TableRowSelection<DataType> = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections,
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Table<DataType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataSource}
      />

      {/* 选中态可视化（antd demo 仅 console.log；这里额外页面展示便于无 console 验证）。 */}
      <div style={{ padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <strong>selectedRowKeys:</strong>{' '}
        {selectedRowKeys.length === 0 ? (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>(none)</span>
        ) : (
          <code>[{selectedRowKeys.join(', ')}]</code>
        )}
        <div style={{ marginTop: 4, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
          点表头全选框旁的下拉箭头，选择 Select All / Invert / None / Odd Row / Even Row。
          打开浏览器 console 可看到 onChange 回调日志（内置项触发；自定义 odd/even 由 demo 内 setState）。
          分页属 S11，本 demo 46 行全显。
        </div>
      </div>
    </div>
  )
}
