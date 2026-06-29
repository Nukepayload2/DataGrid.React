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
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：useVirtualization + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX + columns + rowSelection（renderCell + rowSpan 配置）拆到子文件：
 *   - `./row-selection-custom-debug.dg`：`RowSelectionCustomDebugDg({virtual})`（左栏）
 *   - `./row-selection-custom-debug.antd`：`RowSelectionCustomDebugAntd({virtual})`（右栏）
 *
 * ★ 状态提升说明：本 demo 无控制条（renderCell 逻辑固定），无配置型 state 需提升父。
 *   子组件接 virtual props（瞬时态，父 useVirtualization 顶栏 Switch 驱动；默认 false 合理有效）。
 */

import { SplitDemo } from './_compare/SplitDemo'
// 虚拟化开关（决策 7）：顶栏 Switch 全局驱动两侧 Table 的 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + rowSelection（renderCell + rowSpan）由子组件提供（props 驱动）。
//   RecordType/dataSource 现在由子文件各自 import row-selection-custom-debug.shared；父文件不再需要。
import RowSelectionCustomDebugDg from './row-selection-custom-debug.dg'
import RowSelectionCustomDebugAntd from './row-selection-custom-debug.antd'

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
        left={<RowSelectionCustomDebugDg virtual={virtual} />}
        right={<RowSelectionCustomDebugAntd virtual={virtual} />}
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
