/**
 * row-selection-and-operation demo 的 antd 段（右栏），从 row-selection-and-operation.tsx 拆出。
 *
 * - props 驱动 `{ selectedKeys, onSelectedKeysChange, virtual }`（由父组件传：受控 selectedKeys
 *   真理源 + 顶部 Reload 批量清空经父 setState 同步回两侧）。
 * - 自包含：含 `antdColumns`（纯文本 Name/Age/Address，无 render）+ `<AntdTable>` JSX。
 * - 忠实复刻 antd row-selection-and-operation demo：antd 原生 rowSelection（受控 selectedRowKeys +
 *   onChange）+ pagination:false（46 行全显）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/row-selection-and-operation.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { dataSource, type RecordType } from './_compare/row-selection-and-operation.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd row-selection-and-operation demo（纯文本 Name/Age/Address）
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

export default function RowSelectionAndOperationAntd({
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
  // 右栏（antd）rowSelection：与 antd demo 逐字一致 + 受控 selectedRowKeys（父共享 state）。
  const antdRowSelection: TableProps<RecordType>['rowSelection'] = {
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[]) => {
      // eslint-disable-next-line no-console
      console.log('selectedRowKeys changed: ', keys)
      onSelectedKeysChange(keys)
    },
  }

  return (
    <AntdTable<RecordType>
      rowSelection={antdRowSelection}
      columns={antdColumns}
      dataSource={dataSource}
      /* pagination=false：取消 antd 默认分页（antd demo 默认 10/页），与左栏 data-grid 对齐
         （data-grid 默认不分页）→ 两侧 46 行全显，选中/批量清空在 46 行全显场景下更直观 diff。 */
      pagination={false}
      virtual={virtual}
      scroll={virtual ? { y: 340 } : undefined}
    />
  )
}
