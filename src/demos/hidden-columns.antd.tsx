/**
 * hidden-columns demo 的 antd 段（右栏）。
 *
 * props：`{ checkedList, virtual }`（与左栏 dg 子组件同款）。antd 原生 `column.hidden` + 默认分页。
 */
import { Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import {
  data,
  defaultCheckedList,
  rawColumns,
  type RecordType,
} from './_compare/hidden-columns.shared'

// 右栏 antd 列定义（基于 shared rawColumns 加类型）。
const antdColumns: NonNullable<TableProps<RecordType>['columns']> = rawColumns.map(
  (c) => ({ ...c }),
)

// checkedList 默认值用 defaultCheckedList（全选），而非 []——避免 props 未传时全列隐藏空表。
export default function HiddenColumnsAntd({
  checkedList = defaultCheckedList,
  virtual = false,
}: {
  checkedList: string[]
  virtual: boolean
}) {
  // 不在 checkedList 的列标记为 hidden（对齐 antd demo 写法）。
  const antdNewColumns = antdColumns.map((item) => ({
    ...item,
    hidden: !checkedList.includes(item.key as string),
  }))

  return (
    <AntdTable<RecordType>
      columns={antdNewColumns}
      dataSource={data}
      /* 全局虚拟化开关接入：ON 时叠加 virtual=true + scroll:{y:300}（antd 默认渲染分页条，
         扣除表头~55 + 分页条~50 → 约 300 塞进 split pane 限高）；OFF 时 scroll=undefined。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
