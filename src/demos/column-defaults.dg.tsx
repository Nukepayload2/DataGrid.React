/**
 * column-defaults demo 的 data-grid 段（左栏），从 column-defaults.tsx 拆出。
 *
 * - props 驱动 `{ ellipsis, virtual }`（由 column-defaults.tsx 父组件传）。
 * - 自包含：含 `dgColumns`（Address 用 `align:'start'`，data-grid Align 类型）+ `<Table>` JSX，
 *   Table 级传 `column={{ align:'center', ellipsis }}` 设置所有列默认属性（S32）。
 * - 行为与改造前一致：applyColumnDefaults 浅合并（列自身优先 + 哨兵豁免 + children 递归），
 *   Name/Description 继承 center+ellipsis；Address 自身 `align:'start'` 覆盖默认 center。
 *
 * === S32 列默认值 column ===
 *
 * antd 允许在 Table 级传 `column={{...}}` 设置**所有列的默认属性**，单列可通过自身同名字段覆盖。
 *
 * data-grid 对齐实现（S32）：
 *   - `TableProps.column?: Partial<ColumnType<RecordType>>`。
 *   - 适配层 `applyColumnDefaults`：把 `column` 默认**浅合并**到每个列——**列自身优先**；
 *     哨兵（EXPAND_COLUMN/SELECTION_COLUMN）豁免；多级表头逐层递归合并。
 *
 * === 两侧保留的差异 ===
 *
 * **Align 字面量**：左栏 data-grid 用 'start'/'center'/'end'（对齐 CSS logical）；
 * 右栏 antd 用 'left'/'center'/'right'（antd v6 物理方向）。语义等价（'start'='left'）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/column-defaults.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/column-defaults.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— Address 用 'start'（data-grid Align 类型）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: 140,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: 180,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    // data-grid Align 类型用 'start'/'center'/'end'（'start' 等价 antd 'left'）。
    align: 'start',
    width: 220,
  },
]

export default function ColumnDefaultsDg({
  ellipsis = true,
  virtual = false,
}: {
  ellipsis: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      /* Table 级 column 默认：align:center + ellipsis（控制条驱动）→ Name/Description 继承 center；
         Address 自身 align:'start' 覆盖默认 center（applyColumnDefaults 列自身优先）。 */
      column={{ align: 'center', ellipsis }}
      pagination={false}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的 400px 限高，虚拟窗口才有滚动区）；OFF 时回 undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
