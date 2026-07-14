import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/all-columns-fixed-width.shared'

const columns: ColumnType<RecordType>[] = [
  { title: 'Ticket', dataIndex: 'ticket', key: 'ticket', width: 72 },
  { title: 'Queue', dataIndex: 'queue', key: 'queue', width: 112 },
  { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 96 },
  { title: 'SLA', dataIndex: 'sla', key: 'sla', width: 80, align: 'end' },
]

export default function AllColumnsFixedWidthDg() {
  return (
    <Table<RecordType>
      bordered
      columns={columns}
      dataSource={data}
      pagination={false}
      rowKey="key"
      size="small"
    />
  )
}
