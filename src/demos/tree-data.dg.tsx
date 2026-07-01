import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'
import { data, type RecordType } from './_compare/tree-data.shared'

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

// ---------------------------------------------------------------------------
// 列定义 —— Name/Age/Address 纯文本，无 render（首列缩进 + 展开图标由引擎渲染）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age', width: '12%' },
  { title: 'Address', dataIndex: 'address', key: 'address', width: '30%' },
]

// data-grid has no `onSelect` hook here, so the demo logs selection changes from `onChange`.

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

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function TreeDataDg({
  checkStrictly = false,
  virtual = false,
}: {
  checkStrictly: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{ ...dgRowSelectionBase, checkStrictly }}
      dataSource={data}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
