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
  // 与 antd demo 保持同款偏移：展开内容跳过 Team / 展开列 / Name，从 Age 列开始。
  const dgExpandable: Expandable<RecordType> = {
    expandedRowOffset: 3,
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

