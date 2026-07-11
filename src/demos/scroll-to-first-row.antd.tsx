import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/scroll-to-first-row.shared'

const columns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Group', dataIndex: 'group' },
  { title: 'Index', dataIndex: 'index', align: 'right' },
]

export default function ScrollToFirstRowAntd({
  enabled,
}: {
  enabled: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 12 }}
      scroll={{ y: 180, scrollToFirstRowOnChange: enabled }}
    />
  )
}
