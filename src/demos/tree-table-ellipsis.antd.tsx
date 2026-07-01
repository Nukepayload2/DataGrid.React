import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { data, type RecordType } from './_compare/tree-table-ellipsis.shared'

const antdColumnsBase: TableColumnsType<RecordType> = [
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

export default function TreeTableEllipsisAntd({
  fixed = true,
  virtual = false,
}: {
  fixed: boolean
  virtual: boolean
}) {
  // Only the Name column toggles fixed positioning.
  const antdColumns: TableColumnsType<RecordType> = antdColumnsBase.map((col) =>
    'dataIndex' in col && col.dataIndex === 'name' ? { ...col, fixed } : col,
  )

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={{ columnWidth: 100 }}
      expandable={{ defaultExpandAllRows: true }}
      dataSource={data}
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
