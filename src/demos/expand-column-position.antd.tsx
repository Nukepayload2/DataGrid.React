import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/expand-column-position.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Team',
    dataIndex: 'team',
    key: 'team',
    onCell: (_record, index = 0) =>
      index % 2 === 0 ? { rowSpan: 2 } : { rowSpan: 0 },
    width: 100,
  },
  AntdTable.EXPAND_COLUMN,
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

export default function ExpandStickyAntd({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: readonly React.Key[]
  onExpandedRowsChange: (keys: readonly React.Key[]) => void
  virtual: boolean
}) {
  const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
    expandedRowOffset: 3,
    expandedRowRender: (record) => <div>{record.description}</div>,
    expandedRowKeys,
    onExpandedRowsChange,
  }

  return (
    <AntdTable<RecordType>
      bordered
      columns={antdColumns}
      expandable={antdExpandable}
      dataSource={data}
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}

