import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/all-columns-fixed-width.shared'

const columns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Ticket', dataIndex: 'ticket', key: 'ticket', width: 72 },
  { title: 'Queue', dataIndex: 'queue', key: 'queue', width: 112 },
  { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 96 },
  { title: 'SLA', dataIndex: 'sla', key: 'sla', width: 80, align: 'right' },
]

export default function AllColumnsFixedWidthAntd() {
  return (
    <AntdTable<RecordType>
      bordered
      columns={columns}
      dataSource={data}
      pagination={false}
      rowKey="key"
      size="small"
    />
  )
}
