import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  data,
  defaultCheckedList,
  rawColumns,
  type RecordType,
} from './_compare/hidden-columns.shared'

// 左栏 data-grid 列定义（基于 shared rawColumns 加类型）。
const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))

// checkedList 默认值用 defaultCheckedList（全选），而非 []——避免 props 未传时全列隐藏空表。
export default function HiddenColumnsDg({
  checkedList = defaultCheckedList,
  virtual = false,
}: {
  checkedList: string[]
  virtual: boolean
}) {
  // 不在 checkedList 的列标记为 hidden（对齐 antd demo 写法）。
  const dgNewColumns = dgColumns.map((item) => ({
    ...item,
    hidden: !checkedList.includes(item.key as string),
  }))

  return (
    <Table<RecordType>
      columns={dgNewColumns}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时叠加 virtual=true + scroll:{y:true}（data-grid 数据区域模式，
         CSS 自适应填满 SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；OFF 时 scroll=undefined。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      pagination={{}}
    />
  )
}

