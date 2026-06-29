/**
 * column-defaults demo 的 antd 段（右栏），忠实复刻 antd column-defaults demo。
 * props 驱动 `{ ellipsis, virtual }`（由 column-defaults.tsx 父组件传）。
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
      /* 虚拟化开关接入：ON 时 virtual=true + scroll.y:340（antd 不认 true；本 demo 两侧均
         pagination=false 无分页条，仅需扣除表头~55 → 约 340 才能塞进 ~400px pane；OFF 时回
         undefined）。 */
      virtual={virtual}
      scroll={virtual ? { y: 340 } : undefined}
    />
  )
}
