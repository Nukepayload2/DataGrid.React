import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/column-defaults.shared'

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: 140,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: 180,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    align: 'start',
    width: 220,
  },
]

export default function ColumnDefaultsDg({
  ellipsis = true,
  virtual = false,
}: {
  ellipsis: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      column={{ align: 'center', ellipsis }}
      pagination={false}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}


