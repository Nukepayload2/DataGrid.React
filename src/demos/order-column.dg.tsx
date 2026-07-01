import { Table } from '../table'
import type { ColumnOrSentinel, Expandable, TableRowSelection } from '../table'
import { data, type RecordType } from './_compare/order-column.shared'

const dgColumns: ColumnOrSentinel<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  Table.EXPAND_COLUMN,
  { title: 'Age', dataIndex: 'age', key: 'age' },
  Table.SELECTION_COLUMN,
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

const expandable: Expandable<RecordType> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
}

export default function OrderColumnDg({
  selectedKeys = [],
  onSelectedKeysChange,
  virtual = false,
}: {
  selectedKeys: Array<React.Key>
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  const dgRowSelection: TableRowSelection<RecordType> = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => onSelectedKeysChange(keys),
  }

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={dgRowSelection}
      expandable={expandable}
      dataSource={data}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
