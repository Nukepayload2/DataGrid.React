/**
 * tree-table-ellipsis demo 的 data-grid 段（左栏），从 tree-table-ellipsis.tsx 拆出。
 *
 * - props 驱动 `{ fixed, virtual }`（由 tree-table-ellipsis.tsx 父组件传）：
 *   * fixed：首列 Name 是否固定（由父控制条 Switch 切换，同一档同时驱动两侧）。
 *   * virtual：全局虚拟化开关。
 * - 自包含：含 `dgColumnsBase`（Name ellipsis:true + width:'30%' / Age width:'12%' / Address）+
 *   按 fixed 派生的 `dgColumns` + `<Table>` JSX（rowSelection columnWidth:100 前置哨兵列 +
 *   expandable.defaultExpandAllRows 全展开）。
 * - 行为与改造前一致：树形 data（children 嵌套）+ Name 列 ellipsis 类（dg-cell-ellipsis）+
 *   fixed sticky（Switch 切到 fixed 时 Name 列横向 sticky 定位）+ 树形内容前缀（缩进 + 展开图标）+
 *   rowSelection 前置哨兵列——四机制在引擎 BodyCell 渲染时正交组合（不同层面，不冲突）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/tree-table-ellipsis.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, type RecordType } from './_compare/tree-table-ellipsis.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 字段（title/dataIndex/key/width/ellipsis）与 antd 官方 demo 逐字一致；
// `fixed` 由 props 驱动（在渲染时动态拼装 fixed）。
// ---------------------------------------------------------------------------

const dgColumnsBase: ColumnType<RecordType>[] = [
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
//   「首列 Name 默认固定」语义——仅 Name 列 fixed，Age/Address 非 fixed）。编辑模式
//   SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 不含 fixed，
//   此时子组件用此默认值 → 仅首列 Name fixed（合理有效初值，对齐 antd demo）。
export default function TreeTableEllipsisDg({
  fixed = true,
  virtual = false,
}: {
  fixed: boolean
  virtual: boolean
}) {
  // ★ 仅首列 Name 固定（对齐 antd 官方 tree-table-ellipsis demo 只 fixed Name 列）。
  //   Age/Address 不 fixed —— Address 无 width 时走 minmax(0,1fr) 填充剩余空间被容器拘束，
  //   避免全列 fixed 后 Address 变 max-content 撑爆容器溢出（本 demo 无 scroll.x，溢出会
  //   退化成原生横滚条，违反「scroll.x 关闭即内容被拘束 + 超长文本省略号」约定）。
  //   Name width:'30%' + ellipsis:true → 省略号生效（fixed 仅决定列层横向 sticky）。
  const dgColumns: ColumnType<RecordType>[] = dgColumnsBase.map((col) =>
    col.dataIndex === 'name' ? { ...col, fixed } : col,
  )

  return (
    <Table<RecordType>
      columns={dgColumns}
      rowSelection={{ columnWidth: 100 }}
      expandable={{ defaultExpandAllRows: true }}
      dataSource={data}
      // pagination={{}} 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination）。
      pagination={{}}
      // 虚拟化（决策 7）：ON→virtual+scroll.y=true（CSS 自适应高度，SplitDemo 限高 pane body 提供可滚动区域）；
      // OFF→不传，非虚拟全量 DOM（零回归）。原 demo 无 scroll.x（fixed 走列层 sticky，非 table scroll.x），
      // 故 ON 时不强制 scroll.x。
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
