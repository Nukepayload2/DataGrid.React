/**
 * expand-sticky demo 的 data-grid 段（左栏），从 expand-sticky.tsx 拆出。
 *
 * - props 驱动 `{ expandedRowKeys, onExpandedRowsChange, virtual }`（由 expand-sticky.tsx 父组件传）：
 *   * expandedRowKeys：当前展开行 key 列表（真理源在父——父 Expand All/Collapse All 按钮组直接读写它）。
 *   * onExpandedRowsChange：展开行变化回调（左栏 data-grid 用 onExpandedRowsChange）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（Team 列每 2 行合并 + `Table.EXPAND_COLUMN` 哨兵控位置）+ `<Table>` JSX +
 *   `dgExpandable` 派生。
 * - 行为与改造前一致：bordered + Team 列每 2 行合并 onCell rowSpan:2/0 + `Table.EXPAND_COLUMN` 哨兵
 *   控展开列位置（Team 之后）+ expandable.expandedRowRender。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/expand-sticky.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnOrSentinel, Expandable } from '../table'
import { data, type RecordType } from './_compare/expand-sticky.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）columns —— 哨兵控制位置（行为与改造前一致）
// ---------------------------------------------------------------------------

const dgColumns: ColumnOrSentinel<RecordType>[] = [
  {
    title: 'Team',
    dataIndex: 'team',
    key: 'team',
    width: 100,
    // 每 2 行合并：偶数行 rowSpan=2，奇数行 rowSpan=0（被覆盖）。
    onCell: (_record, index = 0) =>
      index % 2 === 0 ? { rowSpan: 2 } : { rowSpan: 0 },
  },
  // 展开列位置哨兵：放在 Team 之后。
  Table.EXPAND_COLUMN,
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  {
    title: 'Action',
    dataIndex: '',
    key: 'x',
    render: () => <a>Delete</a>,
  },
]

// ★ expandedRowKeys 默认值用 []（无展开是有效态——纯瞬时展开态初始无展开合理，
//   非配置型 state 不需 defaultCheckedList 全选式兜底）。
// 编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 不含
// expandedRowKeys，此时子组件用 [] 默认值 → 所有行收起（合理有效初值），渲染正常。
export default function ExpandStickyDg({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: Array<React.Key>
  onExpandedRowsChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // expandable 左栏同款（expandedRowRender + 受控 expandedRowKeys）。
  // ★ 纯靠 EXPAND_COLUMN 哨兵控位置，不消费 antd 废弃 expandedRowOffset（左栏 data-grid 无此 prop）。
  const dgExpandable: Expandable<RecordType> = {
    expandedRowRender: (record) => <div>{record.description}</div>,
    expandedRowKeys,
    onExpandedRowsChange,
  }

  return (
    <Table<RecordType>
      bordered
      columns={dgColumns}
      expandable={dgExpandable}
      dataSource={data}
      pagination={{}}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
