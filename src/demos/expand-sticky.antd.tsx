/**
 * expand-sticky demo 的 antd 段（右栏），从 expand-sticky.tsx 拆出。
 *
 * - props 驱动 `{ expandedRowKeys, onExpandedRowsChange, virtual }`（与左栏 dg 子组件同款，
 *   真理源在父——共享 expandedRowKeys 受控同时驱动两侧）。
 * - 自包含：含 `antdColumns`（Team 列每 2 行合并 + antd `Table.EXPAND_COLUMN` 哨兵）+
 *   `<AntdTable>` JSX + `antdExpandable` 派生。
 * - 忠实复刻 antd expand-sticky demo：antd `<Table>` bordered + antd `Table.EXPAND_COLUMN` 哨兵 +
 *   antd expandable，含 antd demo 原样的 `expandedRowOffset: 3`（v5.26+ 已废弃但 antd 本体仍接受，
 *   内部转为 EXPAND_COLUMN 等效行为）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/expand-sticky.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/expand-sticky.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）columns —— 忠实复刻 antd expand-sticky demo
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Team',
    dataIndex: 'team',
    key: 'team',
    onCell: (_record, index = 0) =>
      index % 2 === 0 ? { rowSpan: 2 } : { rowSpan: 0 },
    width: 100,
  },
  AntdTable.EXPAND_COLUMN,
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

// ★ expandedRowKeys 默认值用 []（无展开是有效态——纯瞬时展开态初始无展开合理）。
export default function ExpandStickyAntd({
  expandedRowKeys = [],
  onExpandedRowsChange,
  virtual = false,
}: {
  expandedRowKeys: Array<React.Key>
  onExpandedRowsChange: (keys: Array<React.Key>) => void
  virtual: boolean
}) {
  // expandable antd 同款（含废弃 expandedRowOffset: 3——antd demo 原样保留，antd 本体内部等效哨兵）。
  const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
    expandedRowOffset: 3,
    expandedRowRender: (record) => <div>{record.description}</div>,
    expandedRowKeys,
    onExpandedRowsChange,
  }

  return (
    <AntdTable<RecordType>
      bordered
      columns={antdColumns}
      expandable={antdExpandable}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:300（antd 不认 true，需数字像素高度；
         OFF 时回 undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
