/**
 * row-selection-custom-debug demo 的 data-grid 段（左栏），从 row-selection-custom-debug.tsx 拆出。
 *
 * - props 驱动 `{ virtual }`（由父组件传）：
 *   * virtual：全局虚拟化开关（顶栏 Switch ON 时两侧 Table 接入 virtual + scroll.y）。
 *   注：本 demo 含 rowSpan 合并行，合并×虚拟属已知 §9 简化（不在此处理）。
 * - 自包含：含 `dgColumns`（单列 Name）+ `dgRowSelection`（renderCell 自定义勾选格 + 返回
 *   `props.rowSpan` 接入 M3 cellMerge）+ `<Table>` JSX。无控制条（renderCell 逻辑固定，两侧同款）。
 * - 行为与改造前一致：M5 rowSelection `renderCell` 字段自定义勾选格内容 + 返回 `props.rowSpan`
 *   接入 M3 cellMerge（合并行）。
 *
 * === renderCell 接入要点（D1 引擎改动）===
 *
 * - `rowSelection.renderCell` 返回 `{ props, children }`：
 *   * `props.rowSpan`：在 `buildSelectionColumnNode` 的 `onCell` 中提取，返回给 M3 cellMerge
 *     （cellMerge 调 onCell 取 rowSpan/colSpan，被覆盖格 hidden 不渲染）。
 *   * `children`：在 `render` 中提取，替代默认 `<SelectionInput>`（`node` 参数即默认勾选 UI）。
 * - **renderCell 调用 2 次**（render + onCell 各一次，与 antd rc-table 一致）——renderCell 必须是
 *   纯函数（无副作用），否则会被调用两次产生副作用。本 demo 仅读 index/checked/node，纯函数。
 * - **node 参数**：默认 `<SelectionInput>`（勾选交互可用——点 node 内 checkbox 触发 toggleRow）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/row-selection-custom-debug.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { dataSource, type RecordType } from './_compare/row-selection-custom-debug.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 + rowSelection —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
]

/**
 * renderCell（对齐 antd demo 逐字）：
 *   - `props.rowSpan: index % 2 === 0 ? 2 : 0`：偶数行合并 2 行、奇数行被覆盖。
 *   - `children: <>{String(checked)}: {node}</>`：渲染勾选状态文本 + 默认勾选 UI（node）。
 *
 * 注：renderCell 在引擎内会被 render 和 onCell 各调用一次（取 children / 取 props），
 *     必须为纯函数（本函数仅读 index/checked/node，无副作用）。
 */
const dgRowSelection: TableRowSelection<RecordType> = {
  renderCell: (checked, _record, index, node) => ({
    props: { rowSpan: index % 2 === 0 ? 2 : 0 },
    children: (
      <>
        {String(checked)}: {node}
      </>
    ),
  }),
}

// ★ virtual 默认值用 false（瞬时态，父 useVirtualization 顶栏 Switch 驱动）。
//   编辑模式 SplitDemoPreview 的 propsFor 超集 {bordered,virtual,size,autoScroll} 含 virtual，
//   会传入；但作为兜底默认值也需合理有效（false=非虚拟，行为与改造前一致）。
export default function RowSelectionCustomDebugDg({
  virtual = false,
}: {
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      rowSelection={dgRowSelection}
      columns={dgColumns}
      dataSource={dataSource}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
