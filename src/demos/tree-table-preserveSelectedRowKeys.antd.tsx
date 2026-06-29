/**
 * tree-table-preserveSelectedRowKeys demo 的 antd 段（右栏）。props 驱动
 * `{ checkStrictly, preserveSelectedRowKeys, virtual }`（前两个由共享 DemoToolbar Switch 控制）。
 * 忠实复刻 antd demo（含 onSelect）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps as AntdTableProps } from 'antd'
import { dataSource, type RecordType } from './_compare/tree-table-preserveSelectedRowKeys.shared'

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（两侧同款）。
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange + onSelect 控制台日志（各侧独立）；checkStrictly + preserve 由 props 注入。
// ---------------------------------------------------------------------------

const antdRowSelectionBase: AntdTableProps<RecordType>['rowSelection'] = {
  onChange: (selectedRowKeys, selectedRows, info) => {
    // eslint-disable-next-line no-console
    console.log(
      `[antd] selectedRowKeys: ${selectedRowKeys}`,
      'selectedRows: ',
      selectedRows,
      'info',
      info,
    )
  },
  onSelect: (record, selected, selectedRows) => {
    // eslint-disable-next-line no-console
    console.log('[antd] onSelect:', record, selected, selectedRows)
  },
}

export default function TreeTablePreserveSelectedRowKeysAntd({
  checkStrictly = false,
  preserveSelectedRowKeys = true,
  virtual = false,
}: {
  checkStrictly: boolean
  preserveSelectedRowKeys: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={{
        ...antdRowSelectionBase,
        checkStrictly,
        preserveSelectedRowKeys,
      }}
      dataSource={dataSource}
      pagination={{ defaultPageSize: 5 }}
      /* ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
