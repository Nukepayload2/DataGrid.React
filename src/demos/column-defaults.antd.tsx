/**
 * column-defaults demo 的 antd 段（右栏），从 column-defaults.tsx 拆出。
 *
 * - props 驱动 `{ ellipsis, virtual }`（由 column-defaults.tsx 父组件传）。
 * - 自包含：含 `antdColumns`（Address 用 `align:'left'`，antd 物理方向）+ `<AntdTable>` JSX，
 *   Table 级传 `column={{ align:'center', ellipsis }}` 设置所有列默认属性（忠实 antd demo）。
 * - 忠实复刻 antd column-defaults demo：Address `align:'left'`（antd 原生 'left'/'center'/'right'）。
 *
 * === 两侧保留的差异 ===
 *
 * **Align 字面量**：左栏 data-grid 用 'start'/'center'/'end'（对齐 CSS logical）；
 * 右栏 antd 用 'left'/'center'/'right'（antd v6 物理方向）。语义等价（'start'='left'）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/column-defaults.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { data, type RecordType } from './_compare/column-defaults.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实 antd demo，Address 用 'left'
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
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
    align: 'left',
    width: 220,
  },
]

export default function ColumnDefaultsAntd({
  ellipsis = true,
  virtual = false,
}: {
  ellipsis: boolean
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      dataSource={data}
      /* Table 级 column 默认：align:center + ellipsis（控制条驱动）→ Name/Description 继承 center；
         Address 自身 align:'left' 覆盖默认 center（antd mergeProps 列自身优先）。 */
      column={{ align: 'center', ellipsis }}
      pagination={false}
      /* 全局虚拟化开关接入：ON 时 virtual=true + scroll.y:340（antd 不认 true；本 demo 两侧均
         pagination=false 无分页条，仅需扣除表头~55 → 约 340 才能塞进 ~400px pane；OFF 时回
         undefined，行为与改造前一致）。 */
      virtual={virtual}
      scroll={virtual ? { y: 340 } : undefined}
    />
  )
}
