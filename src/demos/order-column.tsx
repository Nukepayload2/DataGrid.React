/**
 * 复刻 antd `order-column` demo（M9 验收）：
 *   `G:\Projects\ant-design\components\table\demo\order-column.tsx`
 *
 * === antd demo 要素 ===
 *
 * - columns 数组中通过 `Table.EXPAND_COLUMN` 和 `Table.SELECTION_COLUMN` 哨兵
 *   控制展开列 / 选择列的位置（不一定首列）。
 * - antd demo 的列顺序：Name → EXPAND_COLUMN → Age → SELECTION_COLUMN → Address。
 * - 同时配 `rowSelection={{}}`（默认 checkbox）和 `expandable.expandedRowRender`。
 *
 * === 验证点（M9）===
 *
 * 1. 展开列位于 Name 与 Age 之间（EXPAND_COLUMN 哨兵位置生效）。
 * 2. 选择列位于 Age 与 Address 之间（SELECTION_COLUMN 哨兵位置生效）。
 * 3. 勾选 / 展开独立工作（M5 × M9 组合，互不干扰）。
 * 4. 选择列：checkbox 全选/半选/单选；展开列：展开/收起 0fr↔1fr 过渡。
 */

import { useState } from 'react'
import { Table } from '../table'
import type { ColumnOrSentinel, Expandable, TableRowSelection } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
  description: string
}

const columns: ColumnOrSentinel<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  // 展开列哨兵：放在 Name 之后。
  Table.EXPAND_COLUMN,
  { title: 'Age', dataIndex: 'age' },
  // 选择列哨兵：放在 Age 之后。
  Table.SELECTION_COLUMN,
  { title: 'Address', dataIndex: 'address' },
]

const data: DataType[] = [
  {
    key: 1,
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    description: 'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.',
  },
  {
    key: 2,
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    description: 'My name is Jim Green, I am 42 years old, living in London No. 1 Lake Park.',
  },
  {
    key: 3,
    name: 'Not Expandable',
    age: 29,
    address: 'Jiangsu No. 1 Lake Park',
    description: 'This not expandable',
  },
  {
    key: 4,
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    description: 'My name is Joe Black, I am 32 years old, living in Sydney No. 1 Lake Park.',
  },
]

const expandable: Expandable<DataType> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
}

export default function OrderColumnDemo() {
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])

  const rowSelection: TableRowSelection<DataType> = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
  }

  return (
    <div style={{ padding: 24 }}>
      <Table<DataType>
        columns={columns}
        rowSelection={rowSelection}
        expandable={expandable}
        dataSource={data}
      />

      <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
        列顺序：Name → <strong>展开列（EXPAND_COLUMN）</strong> → Age →
        <strong> 选择列（SELECTION_COLUMN）</strong> → Address。
        <br />
        选中 keys：{' '}
        {selectedKeys.length === 0 ? (
          <span style={{ color: 'rgba(0,0,0,0.45)' }}>(none)</span>
        ) : (
          <code>[{selectedKeys.map((k) => `"${k}"`).join(', ')}]</code>
        )}
      </div>
    </div>
  )
}
