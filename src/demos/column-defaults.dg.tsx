/**
 * column-defaults demo 的 data-grid 段（左栏）。
 * props 驱动 `{ ellipsis, virtual }`（由 column-defaults.tsx 父组件传）。
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
      /* 虚拟化开关接入：ON 时 virtual=true + scroll.y:true（CSS 自适应，填满 SplitDemo
         给的 400px 限高，虚拟窗口才有滚动区）；OFF 时回 undefined。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
