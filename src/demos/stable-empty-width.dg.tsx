import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  DG_WRAPPER_HEIGHT,
  sampleData,
  type RecordType,
} from './_compare/stable-empty-width.shared'

/**
 * 6 列都声明了数字 px width。demo 里动态增删列，用来观察已声明列宽在空数据、
 * 滚动和增删列时是否保持稳定。
 *
 * 左栏外层包固定高度容器，便于和右栏在同一组操作下直接对照。
 */
const allColumns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', key: 'age', width: 80 },
  { title: 'Address', dataIndex: 'address', key: 'address', width: 220 },
  { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
  { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 160 },
]

export default function StableEmptyWidthDg({
  hasData,
  columnCount,
}: {
  hasData: boolean
  columnCount: number
}) {
  return (
    <div style={{ height: DG_WRAPPER_HEIGHT }}>
      <Table<RecordType>
        bordered
        columns={allColumns.slice(0, columnCount)}
        dataSource={hasData ? sampleData : []}
        pagination={false}
        rowKey="key"
        size="small"
        scroll={{ y: true }}
      />
    </div>
  )
}
