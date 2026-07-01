import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/tree-table-ellipsis.shared'

const dgColumnsBase: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: '30%',
    ellipsis: true,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: '12%',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
]

export default function TreeTableEllipsisDg({
  fixed = true,
  virtual = false,
}: {
  fixed: boolean
  virtual: boolean
}) {
  // Only the Name column toggles fixed positioning.
  const dgColumns: ColumnType<RecordType>[] = dgColumnsBase.map((col) =>
    col.dataIndex === 'name' ? { ...col, fixed } : col,
  )

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{ columnWidth: 100 }}
      expandable={{ defaultExpandAllRows: true }}
      dataSource={data}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
