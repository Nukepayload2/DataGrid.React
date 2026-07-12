import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/special-column-order.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  AntdTable.EXPAND_COLUMN,
  { title: 'Age', dataIndex: 'age', key: 'age' },
  AntdTable.SELECTION_COLUMN,
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
}

export default function OrderColumnAntd({
  virtual = false,
}: {
  virtual: boolean
}) {
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {}

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={antdRowSelection}
      expandable={antdExpandable}
      dataSource={data}
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
