/**
 * hidden-columns demo 的 antd 段（右栏），从 hidden-columns.tsx 拆出。
 *
 * - props 驱动 `{ checkedList, virtual }`（与左栏 dg 子组件同款）。
 * - 自包含：含 `antdColumns`（基于 rawColumns 加 antd TableProps 类型）+ 按 checkedList
 *   派生 hidden 的 `antdNewColumns` + `<AntdTable>` JSX。
 * - 忠实复刻 antd hidden-columns demo：antd 原生 `column.hidden` + 默认分页（antd 对任意行数
 *   渲染 .ant-pagination）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/hidden-columns.shared'`）。
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

// ★ checkedList 默认值用 defaultCheckedList（全选），而非 []。
// 编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 checkedList，
// 此时子组件用此默认值 → 所有列可见（合理有效初值），避免 [] 导致全列隐藏空表。
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
         扣除表头~55 + 分页条~50 → 约 300 塞进 split pane 限高）；
         OFF 时 scroll=undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
