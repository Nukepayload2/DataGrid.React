/**
 * 复刻 antd `row-selection-custom-debug` demo：
 *   `G:\Projects\ant-design\components\table\demo\row-selection-custom-debug.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——`rowSelection.renderCell`
 *   自定义勾选格内容 + 返回 `props.rowSpan` 接入 M3 cellMerge（合并行）。46 行单列 Name。
 * - **右栏（antd Table）**：忠实复刻 antd row-selection-custom-debug demo
 *   （antd `<Table>` + antd 原生 `rowSelection.renderCell`，逐字一致）。
 * - **共享状态 + 控制条**：两侧 renderCell 逻辑一致（`index % 2 === 0 ? 2 : 0` 合并 +
 *   `<>{String(checked)}: {node}</>` 渲染）。无控制条（renderCell 逻辑固定，两侧同款）。
 * - **共享数据**：`RecordType` + `dataSource` 见 `_compare/row-selection-custom-debug.shared.ts`。
 *
 * === D1 边界/隔离用例：rowSelection.renderCell 自定义勾选格（合并行场景）===
 *
 * **目标**：验证 data-grid M5 rowSelection `renderCell` 字段——自定义勾选格内容 +
 * 返回 `props.rowSpan` 接入 M3 cellMerge（合并行）。
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
 *
 * === 两侧保留的差异 ===
 *
 * - **基本逐字复刻**（数据/列/renderCell 逻辑一致）。
 * - **类型差异**：左栏 `TableRowSelection` 来自 data-grid 引擎；右栏 antd
 *   `TableProps['rowSelection']` 来自 antd 本体。两侧 renderCell 签名等价。
 *
 * === 验证点（D1 + 决策 9）===
 *
 * 1. 两侧 46 行渲染，单列 Name + 选择列（renderCell 自定义内容）。
 * 2. 偶数行（0/2/4/...）选择列显示 `false:<SelectionInput>`（或勾选后 `true:<SelectionInput>`），
 *    且向下合并 2 行（与下一奇数行共享一个勾选格）。
 * 3. 奇数行（1/3/5/...）选择列被覆盖（rowSpan=0），无勾选格 DOM。
 * 4. 点击 node 内 checkbox：对应偶数行的 checked 文本变 true/false（toggleRow）。
 */

import { Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableRowSelection } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { dataSource, type RecordType } from './_compare/row-selection-custom-debug.shared'
// 虚拟化开关（决策 7）：顶栏 Switch 全局驱动两侧 Table 的 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'

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

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 + rowSelection —— 忠实复刻 antd row-selection-custom-debug demo
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
]

type AntdTableRowSelection<T extends object = object> = TableProps<T>['rowSelection']

const antdRowSelection: AntdTableRowSelection<RecordType> = {
  renderCell: (checked, _record, index, node) => ({
    props: { rowSpan: index % 2 === 0 ? 2 : 0 },
    children: (
      <>
        {String(checked)}: {node}
      </>
    ),
  }),
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function RowSelectionCustomDebugDemo() {
  // 虚拟化开关（决策 7）：顶栏 Switch ON 时两侧 Table 接入 virtual + scroll.y。
  // 注：本 demo 含 rowSpan 合并行，合并×虚拟属已知 §9 简化（不在此处理）。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（窄表，单列 Name + 选择列=2 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。46 行全显（无分页），
        SplitDemo pane body 内独立滚动。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            rowSelection={dgRowSelection}
            columns={dgColumns}
            dataSource={dataSource}
            virtual={virtual}
            scroll={virtual ? { y: true } : undefined}
          />
        }
        right={
          <AntdTable<RecordType>
            rowSelection={antdRowSelection}
            columns={antdColumns}
            dataSource={dataSource}
            pagination={false}
            virtual={virtual}
            scroll={virtual ? { y: 340 } : undefined}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B20 / D1 rowSelection.renderCell 自定义勾选格）：</strong>
          左右并排呈现 data-grid 与 antd row-selection-custom-debug demo
          （renderCell 自定义勾选格 + rowSpan 合并行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>renderCell</strong>：
              <code>renderCell(checked, record, index, node)</code> 返回
              <code>{'{ props: { rowSpan }, children }'}</code>——
              <code>props.rowSpan: index % 2 === 0 ? 2 : 0</code>，
              <code>children: &lt;&gt;{'{String(checked)}: {node}'}.&lt;/&gt;</code>。
            </li>
            <li>
              <strong>合并行</strong>：偶数行（0/2/4/...）合并 2 行渲染
              <code> checked:node</code>（如 <code>false:&lt;SelectionInput&gt;</code>）；
              奇数行被覆盖（rowSpan=0）不渲染勾选格。
            </li>
            <li>
              <strong>node 参数</strong>：默认 <code>&lt;SelectionInput&gt;</code>，点 node 内
              checkbox 可切换勾选态（checked 文本 true/false 随之变化）。
            </li>
            <li>
              <strong>接入 M3 cellMerge</strong>：data-grid 引擎在 <code>onCell</code> 提取
              <code> props.rowSpan</code> 交给 M3 cellMerge（被覆盖格 hidden 不渲染），
              <code> render</code> 提取 <code>children</code> 替代默认勾选 UI。
              两侧 renderCell 逻辑逐字一致。
            </li>
            <li>
              <strong>类型差异</strong>：左栏 <code>TableRowSelection</code> 来自 data-grid
              引擎；右栏 antd <code>TableProps['rowSelection']</code> 来自 antd 本体。签名等价。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
