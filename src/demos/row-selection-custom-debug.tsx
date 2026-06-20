/**
 * 复刻 antd `row-selection-custom-debug` demo：
 *   `G:\Projects\ant-design\components\table\demo\row-selection-custom-debug.tsx`
 *
 * === D1 边界/隔离用例：rowSelection.renderCell 自定义勾选格（合并行场景）===
 *
 * **目标**：验证 data-grid M5 rowSelection 新增的 `renderCell` 字段——
 * 自定义勾选格内容 + 返回 `props.rowSpan` 接入 M3 cellMerge（合并行）。
 *
 * === antd demo 要素 ===
 *
 * - 46 行数据（`key: i, name: i%2===0 ? 'Edward King i' : 'Another Row'`）。
 * - 单列 Name。
 * - `rowSelection.renderCell(checked, _record, index, node)` 返回：
 *     `{ props: { rowSpan: index % 2 === 0 ? 2 : 0 }, children: <>{String(checked)}: {node}</> }`
 *   - 偶数行：勾选格向下合并 2 行（rowSpan=2），渲染 `checked:node`（如 `false:<SelectionInput>`）。
 *   - 奇数行：被覆盖（rowSpan=0），勾选格不渲染。
 *
 * === data-grid 实现要点 ===
 *
 * - **renderCell 接入**（D1 引擎改动）：`rowSelection.renderCell` 返回 `{ props, children }`：
 *     * `props.rowSpan`：在 `buildSelectionColumnNode` 的 `onCell` 中提取，返回给 M3 cellMerge
 *       （cellMerge 调 onCell 取 rowSpan/colSpan，被覆盖格 hidden 不渲染）。
 *     * `children`：在 `render` 中提取，替代默认 `<SelectionInput>`（`node` 参数即默认勾选 UI）。
 * - **renderCell 调用 2 次**（render + onCell 各一次，与 antd rc-table 一致）——demo 的 renderCell
 *   必须是纯函数（无副作用），否则会被调用两次产生副作用。本 demo 仅读 index/checked/node，纯函数。
 * - **node 参数**：默认 `<SelectionInput>`（勾选交互可用——点 node 内的 checkbox 触发 toggleRow）。
 *   antd demo 同款：`{String(checked)}: {node}` 把勾选状态文本化 + 保留可点击 checkbox。
 *
 * === 验证点（D1）===
 *
 * 1. 46 行渲染，单列 Name + 选择列（renderCell 自定义内容）。
 * 2. 偶数行（0/2/4/...）选择列显示 `false:<SelectionInput>`（或 `true:<SelectionInput>` 勾选后），
 *    且向下合并 2 行（与下一奇数行共享一个勾选格）。
 * 3. 奇数行（1/3/5/...）选择列被覆盖（rowSpan=0），无勾选格 DOM。
 * 4. 点击 node 内 checkbox：对应偶数行的 checked 文本变 true/false（受控 selectedRowKeys 更新）。
 * 5. 回归：row-selection / row-selection-and-operation / row-selection-custom 等 M5/S8/S9 demo 不受影响
 *    （无 renderCell 时走默认 SelectionInput，零回归）。
 */

import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'

interface DataType {
  key: React.Key
  name: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
]

const dataSource: DataType[] = Array.from({ length: 46 }).map((_, i) => ({
  key: i,
  name: i % 2 === 0 ? `Edward King ${i}` : 'Another Row',
}))

/**
 * renderCell（对齐 antd demo 逐字）：
 *   - `props.rowSpan: index % 2 === 0 ? 2 : 0`：偶数行合并 2 行、奇数行被覆盖。
 *   - `children: <>{String(checked)}: {node}</>`：渲染勾选状态文本 + 默认勾选 UI（node）。
 *
 * 注：renderCell 在引擎内会被 render 和 onCell 各调用一次（取 children / 取 props），
 *     必须为纯函数（本函数仅读 index/checked/node，无副作用）。
 */
const rowSelection: TableRowSelection<DataType> = {
  renderCell: (checked, _record, index, node) => ({
    props: { rowSpan: index % 2 === 0 ? 2 : 0 },
    children: (
      <>
        {String(checked)}: {node}
      </>
    ),
  }),
}

export default function RowSelectionCustomDebugDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Table<DataType>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataSource}
      />

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
        }}
      >
        <strong>D1 rowSelection.renderCell 自定义勾选格</strong>：
        <code>renderCell(checked, record, index, node)</code> 返回
        <code>{'{ props: { rowSpan }, children }'}</code>——
        偶数行（0/2/4/...）合并 2 行渲染 <code>{'checked:node'}</code>（如
        <code>false:&lt;SelectionInput&gt;</code>），奇数行被覆盖（rowSpan=0）不渲染。
        <code>props.rowSpan</code> 接入 M3 cellMerge（onCell 提取），<code>children</code> 替代默认勾选 UI。
        点击 node 内 checkbox 可正常切换勾选态（node 是默认 <code>&lt;SelectionInput&gt;</code>）。
      </div>
    </div>
  )
}
