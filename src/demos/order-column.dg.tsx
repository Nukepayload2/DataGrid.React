/**
 * order-column demo 的 data-grid 段（左栏），从 order-column.tsx 拆出。
 *
 * - props 驱动 `{ selectedKeys, onSelectedKeysChange, virtual }`（由 order-column.tsx 父组件传）：
 *   * selectedKeys：当前选中行 key 列表（真理源在父——父底部「左栏 data-grid selectedKeys」
 *     可视化区直接读取它，便于无 console 环境验证选择功能）。
 *   * onSelectedKeysChange：选择变化写回父 state。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（`Table.EXPAND_COLUMN` + `Table.SELECTION_COLUMN` 哨兵控制展开/选择列
 *   位置：Name → 展开 → Age → 选择 → Address）+ `<Table>` JSX + `dgExpandable` 派生 +
 *   `dgRowSelection` 派生。
 * - 行为与改造前一致：哨兵位置 + rowSelection 受控 + expandable.expandedRowRender。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/order-column.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnOrSentinel, Expandable, TableRowSelection } from '../table'
import { data, type RecordType } from './_compare/order-column.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）columns —— 哨兵控制位置（行为与改造前一致）
// ---------------------------------------------------------------------------

const dgColumns: ColumnOrSentinel<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  // 展开列哨兵：放在 Name 之后。
  Table.EXPAND_COLUMN,
  { title: 'Age', dataIndex: 'age', key: 'age' },
  // 选择列哨兵：放在 Age 之后。
  Table.SELECTION_COLUMN,
  { title: 'Address', dataIndex: 'address', key: 'address' },
]

// expandable 左栏同款（expandedRowRender 渲染 description 段落）。
const expandable: Expandable<RecordType> = {
  expandedRowRender: (record) => <p style={{ margin: 0 }}>{record.description}</p>,
}

// ★ selectedKeys 默认值用 []（无选择是有效态——纯瞬时选择态初始无选择合理，
//   非配置型 state 不需 defaultCheckedList 全选式兜底）。
// 编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 不含
// selectedKeys，此时子组件用 [] 默认值 → 所有行未选中（合理有效初值），渲染正常。
export default function OrderColumnDg({
  selectedKeys = [],
  onSelectedKeysChange,
  virtual = false,
}: {
  selectedKeys: Array<React.Key>
  /** 选择变化写回父 state（驱动父底部 selectedKeys 可视化区刷新）。 */
  onSelectedKeysChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // 左栏 rowSelection 受控（便于父底部显示 selectedKeys，对照验证选择功能）。
  const dgRowSelection: TableRowSelection<RecordType> = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => onSelectedKeysChange(keys),
  }

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={dgRowSelection}
      expandable={expandable}
      dataSource={data}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的限高，虚拟窗口才有滚动区；决策2——展开内容直接渲染但不参与虚拟窗口大小）；
         OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
