import { Table } from '../table'
import type { ColumnType, SelectionItem, TableRowSelection } from '../table'
import { dataSource, type RecordType } from './_compare/row-selection-custom.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

export default function RowSelectionCustomDg({
  selectedRowKeys = [],
  onSelectedRowKeysChange,
  virtual = false,
}: {
  selectedRowKeys: Array<React.Key>
  /** 内置项（SELECTION_ALL/INVERT/NONE 与表头/行 checkbox）的 onChange 经此回调上抛父；
   * 自定义 odd/even 项也经此回调上抛。 */
  onSelectedRowKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  const dgSelections: Array<SelectionItem> = [
    Table.SELECTION_ALL,
    Table.SELECTION_INVERT,
    Table.SELECTION_NONE,
    {
      key: 'odd',
      text: 'Select Odd Row',
      onSelect: (changeableRowKeys) => {
        // antd demo 原样：filter index % 2 !== 0 → false（保留偶数 index 项）。
        const newSelectedRowKeys = changeableRowKeys.filter((_, index) => {
          if (index % 2 !== 0) {
            return false
          }
          return true
        })
        onSelectedRowKeysChange(newSelectedRowKeys)
      },
    },
    {
      key: 'even',
      text: 'Select Even Row',
      onSelect: (changeableRowKeys) => {
        // antd demo 原样：filter index % 2 !== 0 → true（保留奇数 index 项）。
        const newSelectedRowKeys = changeableRowKeys.filter((_, index) => {
          if (index % 2 !== 0) {
            return true
          }
          return false
        })
        onSelectedRowKeysChange(newSelectedRowKeys)
      },
    },
  ]

  const dgRowSelection: TableRowSelection<RecordType> = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: Array<React.Key>) => {
      // eslint-disable-next-line no-console
      console.log('selectedRowKeys changed: ', newSelectedRowKeys)
      onSelectedRowKeysChange(newSelectedRowKeys)
    },
    selections: dgSelections,
  }

  return (
    <Table<RecordType>
      rowSelection={dgRowSelection}
      columns={dgColumns}
      dataSource={dataSource}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
