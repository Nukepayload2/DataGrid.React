/**
 * order-column demo 的 data-grid 段（左栏）。
 *
 * - props 驱动 `{ selectedKeys, onSelectedKeysChange, virtual }`（由父组件传）：
 *   selectedKeys：当前选中行 key 列表（真理源在父，父底部可视化区读取）；
 *   onSelectedKeysChange：选择变化写回父；virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（`Table.EXPAND_COLUMN` + `Table.SELECTION_COLUMN` 哨兵控制展开/选择列
 *   位置：Name → 展开 → Age → 选择 → Address）+ `<Table>` JSX + `dgExpandable` 派生 +
 *   `dgRowSelection` 派生。
 */
import { Table } from '../table'
import type { ColumnOrSentinel, Expandable, TableRowSelection } from '../table'
import { data, type RecordType } from './_compare/order-column.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）columns —— 哨兵控制位置
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

// selectedKeys 默认值用 []（纯瞬时选择态初始无选择，合理有效初值）。
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
  // 左栏 rowSelection 受控（便于父底部显示 selectedKeys）。
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
         给的限高，虚拟窗口才有滚动区；展开内容直接渲染但不参与虚拟窗口大小）；
         OFF 时回 undefined。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
