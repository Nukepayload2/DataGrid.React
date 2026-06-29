/**
 * row-selection-and-operation demo 的 data-grid 段（左栏），从 row-selection-and-operation.tsx 拆出。
 *
 * - props 驱动 `{ selectedKeys, onSelectedKeysChange, virtual }`（由父组件传：受控 selectedKeys
 *   真理源 + 顶部 Reload 批量清空经父 setState 同步回两侧）。
 * - 自包含：含 `dgColumns`（纯文本 Name/Age/Address，无 render）+ `<Table>` JSX。
 * - 行为与改造前一致：rowSelection.selectedRowKeys 受控（父共享 state）+ onChange 写回父 state。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/row-selection-and-operation.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { dataSource, type RecordType } from './_compare/row-selection-and-operation.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 与 antd demo 列结构一致（纯文本 Name/Age/Address，无 render）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

export default function RowSelectionAndOperationDg({
  selectedKeys = [],
  onSelectedKeysChange = () => {},
  virtual = false,
}: {
  /** 受控 selectedKeys（父组件真理源），默认 [] 合理（初始无选择是有效态）。 */
  selectedKeys: Array<React.Key>
  /** 选择变化写回父 state（驱动两侧同步 + 顶部 Reload 启用/Selected N items 文案）。 */
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // 左栏（data-grid）rowSelection：selectedRowKeys 受控（父共享 state）+ onChange 写回父 state。
  // 与改造前一致：console.log（与 antd demo 同款），同时更新受控 state（两侧共用）。
  const dgRowSelection: TableRowSelection<RecordType> = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => {
      // eslint-disable-next-line no-console
      console.log('selectedRowKeys changed: ', keys)
      onSelectedKeysChange(keys)
    },
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
