import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { sampleData, SCROLL_Y, type RecordType } from './_compare/stable-empty-width.shared'

/**
 * 与 data-grid 侧保持同一组列定义，便于对比空数据、滚动和增删列时的列宽变化。
 *
 * 右栏保留原生 antd Table 作为基线，便于直接观察这些可见差异。
 */
const allColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address', width: 220 },
  { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
  { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 160 },
]

export default function StableEmptyWidthAntd({
  hasData,
  columnCount,
}: {
  hasData: boolean
  columnCount: number
}) {
  return (
    <AntdTable<RecordType>
      bordered
      columns={allColumns.slice(0, columnCount)}
      dataSource={hasData ? sampleData : []}
      pagination={false}
      rowKey="key"
      size="small"
      scroll={{ y: SCROLL_Y }}
    />
  )
}
