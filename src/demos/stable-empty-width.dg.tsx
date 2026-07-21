import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  DG_WRAPPER_HEIGHT,
  sampleData,
  type RecordType,
} from './_compare/stable-empty-width.shared'

/**
 * 6 列全部声明数字 px width。demo 期间动态 slice(0, columnCount) 增删。
 *
 * `grid-template-columns` 是列宽单点真理源（源码 `useGridLayout` 算出、`GridTable` inline 注入），
 * 与 dataSource 是否为空**正交**——空/非空、增删列时 track 列表都是声明式，
 * 无中间测量态，故列宽稳定不跳。
 *
 * data-grid 的 `scroll.y` 仅接受 `true`（与 antd 数字 max-height 不同）：父容器需明确高度，
 * 故外层包固定高度 div（与 fixed-header.dg.tsx 一致）。
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
