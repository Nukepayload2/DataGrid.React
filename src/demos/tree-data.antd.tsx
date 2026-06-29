/**
 * tree-data demo 的 antd 段（右栏）。props 驱动 `{ checkStrictly, virtual }`
 * （checkStrictly 由父级 DemoToolbar Switch 驱动）。忠实复刻 antd tree-data demo。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps as AntdTableProps } from 'antd'
import { data, type RecordType } from './_compare/tree-data.shared'

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（antd 原生树形展开 + 缩进）
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// ---------------------------------------------------------------------------
// rowSelection —— onChange + onSelect console.log（忠实复刻 antd demo）；
// checkStrictly 由 props 注入。
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

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function TreeDataAntd({
  checkStrictly = false,
  virtual = false,
}: {
  checkStrictly: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={{ ...antdRowSelectionBase, checkStrictly }}
      dataSource={data}
      // ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）。
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
