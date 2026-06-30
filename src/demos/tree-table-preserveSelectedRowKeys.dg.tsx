/**
 * tree-table-preserveSelectedRowKeys demo 的 data-grid 段（左栏）。props 驱动
 * `{ checkStrictly, preserveSelectedRowKeys, virtual }`（前两个由共享 DemoToolbar Switch 控制）。
 * rowSelection 的 onChange console.log 各侧独立。
 */
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { dataSource, type RecordType } from './_compare/tree-table-preserveSelectedRowKeys.shared'

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（两侧同款）。
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange 控制台日志（各侧独立）；checkStrictly + preserve 由 props 注入。
// 注：data-grid TableRowSelection 仅声明 onChange（功能等价于 antd onSelect）。
// ---------------------------------------------------------------------------

const dgRowSelectionBase: TableRowSelection<RecordType> = {
  onChange: (selectedRowKeys, selectedRows, info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[data-grid] selectedRowKeys: ${selectedRowKeys}`,
      'selectedRows: ',
      selectedRows,
      'info',
      info,
    )
  },
}

export default function TreeTablePreserveSelectedRowKeysDg({
  checkStrictly = false,
  preserveSelectedRowKeys = true,
  virtual = false,
}: {
  checkStrictly: boolean
  preserveSelectedRowKeys: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{
        ...dgRowSelectionBase,
        checkStrictly,
        preserveSelectedRowKeys,
      }}
      dataSource={dataSource}
      pagination={{ defaultPageSize: 5 }}
      /* ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
