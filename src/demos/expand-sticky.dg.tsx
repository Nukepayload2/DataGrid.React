/**
 * expand-sticky demo 的 data-grid 段（左栏）。
 * bordered + Team 列每 2 行合并 + EXPAND_COLUMN 哨兵控展开列位置（Team 之后）
 * + expandable.expandedRowRender。
 */
import { Table } from '../table'
import type { ColumnOrSentinel, Expandable } from '../table'
import { data, type RecordType } from './_compare/expand-sticky.shared'

const dgColumns: ColumnOrSentinel<RecordType>[] = [
  {
    title: 'Team',
    dataIndex: 'team',
    key: 'team',
    width: 100,
    // 每 2 行合并：偶数行 rowSpan=2，奇数行 rowSpan=0（被覆盖）。
    onCell: (_record, index = 0) =>
      index % 2 === 0 ? { rowSpan: 2 } : { rowSpan: 0 },
  },
  // 展开列位置哨兵：放在 Team 之后。
  Table.EXPAND_COLUMN,
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: () => <a>Delete</a>,
  },
]

export default function ExpandStickyDg({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: Array<React.Key>
  onExpandedRowsChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // 纯靠 EXPAND_COLUMN 哨兵控位置，不消费 antd 废弃 expandedRowOffset（data-grid 无此 prop）。
  const dgExpandable: Expandable<RecordType> = {
    expandedRowRender: (record) => <div>{record.description}</div>,
    expandedRowKeys,
    onExpandedRowsChange,
  }

  return (
    <Table<RecordType>
      bordered
      columns={dgColumns}
      expandable={dgExpandable}
      dataSource={data}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
