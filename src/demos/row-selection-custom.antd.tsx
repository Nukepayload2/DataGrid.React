/**
 * row-selection-custom demo 的 antd 段（右栏），从 row-selection-custom.tsx 拆出。
 *
 * - props 驱动 `{ selectedRowKeys, onSelectedRowKeysChange, virtual }`（与左栏 dg 子组件同款）。
 * - 自包含：含 `antdColumns`（Name/Age/Address）+ 右栏 `antdSelections`（3 内置哨兵
 *   + odd/even 自定义，与 antd demo 逐字一致）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd row-selection-custom demo：pagination={false}（46 行全显）+
 *   rowSelection.selections + 受控 selectedRowKeys。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/row-selection-custom.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { dataSource, type RecordType } from './_compare/row-selection-custom.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd row-selection-custom demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

export default function RowSelectionCustomAntd({
  selectedRowKeys = [],
  onSelectedRowKeysChange,
  virtual = false,
}: {
  selectedRowKeys: Array<React.Key>
  /** 与左栏 dg 子组件同款：内置项 onChange + 自定义 odd/even 的 onSelect 都经此回调上抛父。 */
  onSelectedRowKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // 右栏（antd）selections：与 antd demo 逐字一致（3 内置 + odd/even），叠加受控 selectedRowKeys。
  const antdSelections: NonNullable<
    NonNullable<TableProps<RecordType>['rowSelection']>['selections']
  > = [
    AntdTable.SELECTION_ALL,
    AntdTable.SELECTION_INVERT,
    AntdTable.SELECTION_NONE,
    {
      key: 'odd',
      text: 'Select Odd Row',
      onSelect: (changeableRowKeys) => {
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

  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: Array<React.Key>) => {
      // eslint-disable-next-line no-console
      console.log('selectedRowKeys changed: ', newSelectedRowKeys)
      onSelectedRowKeysChange(newSelectedRowKeys)
    },
    selections: antdSelections,
  }

  return (
    <AntdTable<RecordType>
      rowSelection={antdRowSelection}
      columns={antdColumns}
      dataSource={dataSource}
      pagination={false}
      virtual={virtual}
      scroll={virtual ? { y: 340 } : undefined}
    />
  )
}
