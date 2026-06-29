/**
 * 复刻 antd ellipsis-custom-tooltip demo：
 *   `G:\Projects\ant-design\components\table\demo\ellipsis-custom-tooltip.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`column.ellipsis: { showTitle: false }` S21
 *   关闭默认 native title + render 内 antd `<Tooltip placement="topLeft">` 接管 hover）。
 * - **右栏（antd Table）**：忠实复刻 antd ellipsis-custom-tooltip demo（antd 原生
 *   `ellipsis: { showTitle: false }` + antd `<Tooltip>` render）。
 * - **共享控制条**：`Bordered` 开关（antd demo 原本无控制条，此处加最小开关便于对照）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/ellipsis-custom-tooltip.shared.ts`。
 *
 * === 两侧列宽策略（C1 后已对齐）===
 *
 * C1 列宽策略（§11 第 0 步）落地后：任一 ellipsis 列（对象 `{ showTitle: false }` 也算 truthy）
 * → 派生 `tableLayout:'fixed'` → grid-template-columns 用 `minmax(width,1fr)` / 无 width 列
 * `minmax(0,1fr)`，与 antd `<table width:100%>`+tableLayout:fixed 等效 → 省略号 `...` 生效
 * （scrollWidth>clientWidth，与 antd 一致）。之前 §9 记的 ellipsis 视觉 gap（auto 模式）在本 demo
 * 已消除。S21 核心验证 showTitle 开关 + Tooltip hover，C1 后省略号视觉亦对齐。
 *
 * === S21 验证点（回归）===
 *
 * 1. **showTitle:false 关闭默认 native title**：`ellipsis: { showTitle: false }` 列的 cell-inner
 *    **不加** native `title` 属性（S20 的 toEllipsisTitle 门被 showTitle !== false 判定挡住）。
 * 2. **antd Tooltip 接管 hover**：render 内 `<Tooltip placement="topLeft" title={address}>`
 *    悬浮单元格显示 antd Tooltip（placement topLeft）。
 * 3. **回归不破**：`ellipsis: true`（S20 默认 showTitle=true）列仍加 native title；
 *    非 ellipsis 列（Name render `<a>`、Age 数值）正常显示。
 *
 * === 拆子文件（live 编辑接入）===
 *
 * 父文件只保留「外壳职责」：bordered state + useVirtualization + DemoToolbar(Switch Bordered)
 * + SplitDemo 外壳 + children 对照说明。两侧表格 JSX 与 columns（含 `<Tooltip>` render）拆到子文件：
 *   - `./ellipsis-custom-tooltip.dg`：`EllipsisCustomTooltipDg({bordered, virtual})`（左栏）
 *   - `./ellipsis-custom-tooltip.antd`：`EllipsisCustomTooltipAntd({bordered, virtual})`（右栏）
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns（含 Tooltip render）由子组件提供（props 驱动）。
//   RecordType/data 现在由子文件各自 import ellipsis-custom-tooltip.shared，父文件不再需要。
import EllipsisCustomTooltipDg from './ellipsis-custom-tooltip.dg'
import EllipsisCustomTooltipAntd from './ellipsis-custom-tooltip.antd'

export default function EllipsisCustomTooltipDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=600（同 ellipsis demo：Address×4 长文本列，略宽于 480）→ 横排阈值 ≈ 1216。
        常规笔记本视口（≥1280）横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={
          <EllipsisCustomTooltipDg bordered={bordered} virtual={virtual} />
        }
        right={
          <EllipsisCustomTooltipAntd bordered={bordered} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>
          左右并排呈现 data-grid 与 antd ellipsis-custom-tooltip demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>ellipsis: {'{ showTitle: false }'}</strong>：Address ×4 列均关闭默认 native title。
              左栏 data-grid S21 实现（toEllipsisTitle 门被 showTitle !== false 挡住，cell-inner 不加
              title 属性）；右栏 antd 原生 showTitle:false。
            </li>
            <li>
              <strong>antd Tooltip 接管 hover</strong>：两侧 render 内均用
              <code>&lt;Tooltip placement="topLeft" title={'{address}'}&gt;</code>（决策 6：tooltip 用 antd）。
              hover 单元格显示 antd Tooltip（placement topLeft）。
            </li>
            <li>
              <strong>省略号视觉（C1 后对齐）</strong>：任一 ellipsis 列（含 <code>{'{' + ' showTitle: false }'}</code>
              对象形式）→ 派生 <code>tableLayout:'fixed'</code> → grid <code>minmax(width,1fr)</code> /
              无 width 列 <code>minmax(0,1fr)</code>，与 antd <code>&lt;table width:100%&gt;</code>+
              tableLayout:fixed 等效 → 省略号 <code>...</code> 生效（§11 C1 第 0 步落地，原 §9 ellipsis
              视觉 gap 在本 demo 已消除）。
            </li>
            <li>
              <strong>非 ellipsis 列</strong>：Name（render <code>&lt;a&gt;</code>，width 150）+ Age
              （width 80）正常显示。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
