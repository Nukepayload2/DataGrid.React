import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/scroll-to-first-row.shared'

const columns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Group', dataIndex: 'group' },
  { title: 'Index', dataIndex: 'index', align: 'end' },
]

export default function ScrollToFirstRowDg({
  enabled,
}: {
  enabled: boolean
}) {
  return (
    <div style={{ height: 280 }}>
      <Table<RecordType>
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 12 }}
        scroll={{ y: true, scrollToFirstRowOnChange: enabled }}
      />
    </div>
  )
}
