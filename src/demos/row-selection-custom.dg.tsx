/**
 * row-selection-custom demo 的 data-grid 段（左栏）。
 *
 * - props 驱动 `{ selectedRowKeys, onSelectedRowKeysChange, virtual }`：
 *   selectedRowKeys / onSelectedRowKeysChange：受控选择态真理源在父，子组件只读 + 回调上抛
 *   （父还渲染页面下方的「selectedRowKeys 可视化区」）；virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（Name/Age/Address 纯文本）+ 左栏 `dgSelections`（3 内置哨兵
 *   + odd/even 自定义，与 antd demo 逐字一致）+ `<Table>` JSX。
 */
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
  // 左栏（data-grid）selections：3 内置 + odd/even 自定义，与 antd demo 逐字一致。
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
