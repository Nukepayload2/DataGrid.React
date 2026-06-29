/**
 * hidden-columns demo 的 data-grid 段（左栏），从 hidden-columns.tsx 拆出。
 *
 * - props 驱动 `{ checkedList, virtual }`（由 hidden-columns.tsx 父组件传）：
 *   * checkedList：当前显示的列 key 列表（真理源在父——父渲染 Checkbox.Group 控制条）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumns`（基于 rawColumns 加 data-grid ColumnType 类型）+ 按 checkedList
 *   派生 hidden 的 `dgNewColumns` + `<Table>` JSX。
 * - 行为与改造前一致：`column.hidden` → 引擎 grid track `0fr`，单元格/表头格 `visibility:hidden`，
 *   track 不删除保线号稳定。
 *   注：`.dg-grid` 声明了 `transition: grid-template-columns 0.3s`，但本 demo 列均无 width
 *   （track=max-content，非可动画尺寸），实际为瞬切（CSS 固有约束，非 bug）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/hidden-columns.shared'`），源码可原样展示无需路径改写。
 */
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

// ★ checkedList 默认值用 defaultCheckedList（全选），而非 []。
// 编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 checkedList，
// 此时子组件用此默认值 → 所有列可见（合理有效初值），避免 [] 导致全列隐藏空表。
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
         CSS 自适应填满 SplitDemo 给的 400px 限高，虚拟窗口才有滚动区）；
         OFF 时 scroll=undefined，行为与改造前一致。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
      pagination={{}}
    />
  )
}
