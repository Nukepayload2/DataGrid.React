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
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
