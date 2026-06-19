/**
 * 参考 antd `expand-sticky` demo（M9 验收）：
 *   `G:\Projects\ant-design\components\table\demo\expand-sticky.tsx`
 *
 * === antd demo 要素 ===
 *
 * - bordered。
 * - 合并行：Team 列每 2 行合并（onCell rowSpan: 2 / 0）。
 * - `Table.EXPAND_COLUMN` 哨兵控制展开列位置（Team 之后）。
 * - `expandable.expandedRowOffset: 3`（antd **已废弃**，等效于把展开列放在第 3 列位置，
 *   antd 建议改用 `Table.EXPAND_COLUMN`——本 demo 直接用 EXPAND_COLUMN 哨兵，不消费 offset）。
 * - `expandable.expandedRowRender(record)`：展开 description。
 *
 * === 简化说明 ===
 *
 * antd 的 `expandedRowOffset` 已废弃（v5.26+）：设置后会强制把前 N 列设为固定列 + 展开列偏移。
 * 官方建议改用 `Table.EXPAND_COLUMN` 通过列顺序控制位置。本 demo 按官方建议实现（用 EXPAND_COLUMN
 * 哨兵），不复刻废弃的 offset 行为（避免实现糟粕机制）。
 *
 * === 验证点（M9）===
 *
 * 1. 展开列位于 Team 列之后、Name 列之前（EXPAND_COLUMN 哨兵位置生效）。
 * 2. Team 列每 2 行合并（M3 合并 × M9 展开组合：合并 track 与展开 track 各自独立，互不干扰）。
 * 3. 展开内容跨整行（grid-column: 1 / -1），不受合并列影响。
 * 4. bordered + 展开视觉正确。
 * 5. 展开/收起 0fr↔1fr 过渡平滑。
 */

import { Table } from '../table'
import type { ColumnOrSentinel, Expandable } from '../table'

interface DataType {
  key: React.Key
  team: string
  name: string
  age: number
  address: string
  description: string
}

const columns: ColumnOrSentinel<DataType>[] = [
  {
    title: 'Team',
    dataIndex: 'team',
    width: 100,
    // 每 2 行合并：偶数行 rowSpan=2，奇数行 rowSpan=0（被覆盖）。
    onCell: (_record, index = 0) =>
      index % 2 === 0 ? { rowSpan: 2 } : { rowSpan: 0 },
  },
  // 展开列位置哨兵：放在 Team 之后。
  Table.EXPAND_COLUMN,
  { title: 'Name', dataIndex: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
  {
    title: 'Action',
    dataIndex: '',
    render: () => <a>Delete</a>,
  },
]

const data: DataType[] = [
  {
    key: 1,
    team: 'Team A',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    description: 'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.',
  },
  {
    key: 2,
    team: 'Team A',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    description: 'My name is Jim Green, I am 42 years old, living in London No. 1 Lake Park.',
  },
  {
    key: 3,
    team: 'Team B',
    name: 'Not Expandable',
    age: 29,
    address: 'Jiangsu No. 1 Lake Park',
    description: 'This not expandable',
  },
  {
    key: 4,
    team: 'Team B',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    description: 'My name is Joe Black, I am 32 years old, living in Sydney No. 1 Lake Park.',
  },
]

const expandable: Expandable<DataType> = {
  // 注：antd demo 的 expandedRowOffset: 3 已废弃，本 demo 改用 Table.EXPAND_COLUMN 控位置。
  expandedRowRender: (record) => <div>{record.description}</div>,
}

export default function ExpandStickyDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Table<DataType>
        bordered
        columns={columns}
        expandable={expandable}
        dataSource={data}
      />

      <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8, color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
        展开列通过 <code>Table.EXPAND_COLUMN</code> 哨兵放在 Team 列之后。
        antd 的 <code>expandedRowOffset</code> 已废弃（v5.26+），官方建议改用 EXPAND_COLUMN，
        本 demo 按官方建议实现。Team 列每 2 行合并（M3 × M9 组合）。
      </div>
    </div>
  )
}
