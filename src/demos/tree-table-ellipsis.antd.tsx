/**
 * tree-table-ellipsis demo 的 antd 段（右栏），从 tree-table-ellipsis.tsx 拆出。
 *
 * - props 驱动 `{ fixed, virtual }`（与左栏 dg 子组件同款，由 tree-table-ellipsis.tsx 父组件传）：
 *   * fixed：首列 Name 是否固定（同一档同时驱动两侧）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `antdColumnsBase`（Name ellipsis:true + width:'30%' / Age width:'12%' / Address）+
 *   按 fixed 派生的 `antdColumns` + `<AntdTable>` JSX（rowSelection columnWidth:100 +
 *   expandable.defaultExpandAllRows 全展开）。
 * - 忠实复刻 antd tree-table-ellipsis demo：antd 原生 `<Table>` + 同列结构 + 同 rowSelection + 同 expandable。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/tree-table-ellipsis.shared'`）。
 */
import { Table as AntdTable } from 'antd'
import type { TableColumnsType } from 'antd'
import { data, type RecordType } from './_compare/tree-table-ellipsis.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 字段（title/dataIndex/key/width/ellipsis）与 antd 官方 demo 逐字一致；
// `fixed` 由 props 驱动（在渲染时动态拼装 fixed）。
// ---------------------------------------------------------------------------

const antdColumnsBase: TableColumnsType<RecordType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: '30%',
    ellipsis: true,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
    width: '12%',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
]

// ★ fixed 默认值用 true（配置型 state，父控制条 Switch 切换；初值 true 对齐 antd demo
//   「首列默认固定」语义）。编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll}
//   不含 fixed，此时子组件用此默认值 → 首列 fixed（合理有效初值，对齐 antd demo）。
export default function TreeTableEllipsisAntd({
  fixed = true,
  virtual = false,
}: {
  fixed: boolean
  virtual: boolean
}) {
  const antdColumns: TableColumnsType<RecordType> = antdColumnsBase.map(
    (col) => ({ ...col, fixed }),
  )

  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      rowSelection={{ columnWidth: 100 }}
      expandable={{ defaultExpandAllRows: true }}
      dataSource={data}
      // 虚拟化（决策 7）：ON→virtual+scroll.y=300（有分页，antd scroll.y 须数字）；OFF→不传，非虚拟（零回归）。
      // 原 antd demo 无 scroll.x（fixed 走列层 sticky），ON 时不强制 scroll.x。
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
