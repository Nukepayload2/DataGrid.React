/**
 * 复刻 antd `tree-table-ellipsis` demo（S25 issue #36583 复现）：
 *   `G:\Projects\ant-design\components\table\demo\tree-table-ellipsis.tsx`
 *
 * === 决策 9 双栏对照（S25 树形首列 ellipsis + fixed 组合）===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致——树形 data（children 嵌套）+
 *   Name 列 `ellipsis:true + width:'30%' + fixed`（Switch 受控）+ rowSelection 前置 +
 *   defaultExpandAllRows 全展开。
 * - **右栏（antd Table）**：忠实复刻 antd tree-table-ellipsis demo（antd 原生 `<Table>` +
 *   同列结构 + 同 rowSelection + 同 expandable）。
 * - **共享控制条**：`Fixed first column` 开关同时驱动两侧（默认 true，对齐 antd demo）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/tree-table-ellipsis.shared.ts`。
 *
 * === S25 核心验证点（issue #36583 组合）===
 *
 * issue #36583 是 antd **树形首列 ellipsis + fixed** 的组合 bug（缩进/展开图标在 fixed 列
 * 内渲染异常）。data-grid 复刻此组合验证四机制共存：
 *
 * 1. **树形首列**（Name = 第一个含 dataIndex 的叶子列）：
 *    - 缩进（`level × indentSize`，S13 useTreeData）。
 *    - 展开图标（hasChildren 行，▶/▼，点击 toggle）。
 * 2. **ellipsis 类**（S20）：Name 列加 `dg-cell-ellipsis`（CSS text-overflow:ellipsis）+ native title。
 * 3. **fixed sticky**（M2）：Switch 切到 fixed 时，Name 列 `position:sticky; left:<offset>`，
 *    横向滚动时固定；表头格同侧固定。
 * 4. **rowSelection**（M5）：选择列作为前置哨兵列（columnWidth 100），在 Name 之前。
 *
 * 四机制在引擎 BodyCell 渲染时**正交组合**（不同层面：fixed sticky 定位 / ellipsis CSS 类 /
 * 树形内容前缀 / rowSelection），不冲突——组合正确工作。
 *
 * === 两侧保留的差异（对照价值）===
 *
 * 1. **checkStrictly 默认值（§9 S13/S25，已核对）**：antd 6.4.4 `rowSelection.checkStrictly`
 *    默认 **true**（父子独立勾选）。本 demo 两侧 rowSelection 均**未显式传 checkStrictly**
 *    （antd 官方 `tree-table-ellipsis.tsx:110` 与本 demo 左右两栏均只传 `columnWidth:100`），
 *    故两侧都走默认 true → **行为一致**（父子独立），无需两侧显式同传对齐。
 * 2. **ellipsis 视觉对齐**（§11 第 0 步 C1 列宽策略修复后已对齐）：data-grid `derivedTableLayout`
 *    完整复刻 antd mergedTableLayout——首列 `ellipsis:true` 隐式派生 `tableLayout:'fixed'` +
 *    `.dg-grid{width:100%}` + 无 width 列 `minmax(0,1fr)`（min:0 收缩），ellipsis 列 track<content
 *    → `...` 生效（scrollWidth>clientWidth），与 antd `<table>{width:100%}` + tableLayout:fixed
 *    视觉一致。Name 列超长树名稳定省略号。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：fixed state（父控制条 Switch 直接驱动）+ useVirtualization +
 * DemoToolbar(Switch Fixed first column) + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX + columns 派生拆到子文件：
 *   - `./tree-table-ellipsis.dg`：`TreeTableEllipsisDg({fixed, virtual})`（左栏）
 *   - `./tree-table-ellipsis.antd`：`TreeTableEllipsisAntd({fixed, virtual})`（右栏）
 *
 * ★ 状态提升说明：fixed 必须留父——父渲染顶部 Fixed first column 开关需直接读写它；且同一 state
 *   驱动两侧同步。子组件接 fixed + virtual props（配置型 state 提升，默认值 true 合理有效）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 虚拟化开关接入（决策 7）：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
// 树形展开行视为普通行（决策 2），虚拟路径同样被 RO 实测（measured-first + 约定兜底）。
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（props 驱动）。RecordType/data 现在由
//   子文件各自 import tree-table-ellipsis.shared；父文件不再需要。
import TreeTableEllipsisDg from './tree-table-ellipsis.dg'
import TreeTableEllipsisAntd from './tree-table-ellipsis.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function TreeTableEllipsisDemo() {
  // ★ 共享状态：同一个 fixed state 同时驱动两侧表格。
  // 默认 true（对齐 antd demo：首列默认固定，Switch 可切换）。
  const [fixed, setFixed] = useState(true)
  // 虚拟化开关接入（决策 7）：顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个 fixed state 同时驱动两侧。 */}
      <DemoToolbar>
        <Space align="center">
          <span>Fixed first column:</span>
          <Switch checked={fixed} onChange={setFixed} />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900（scroll.x 隐式宽表，Name name 超长撑开 + 固定列 + 选择列）→
        横排阈值 ≈ 900×2+16 = 1816px。常规笔记本视口（1440–1920）下竖排
        （每栏全宽，宽表内容更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={<TreeTableEllipsisDg fixed={fixed} virtual={virtual} />}
        right={<TreeTableEllipsisAntd fixed={fixed} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B16 / S25 树形首列 ellipsis + fixed 组合，issue #36583）：</strong>
          左右并排呈现 data-grid 与 antd tree-table-ellipsis demo（树形 name 超长 +
          Name ellipsis+fixed(Switch) + defaultExpandAllRows + rowSelection）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>四机制正交</strong>（data-grid 引擎 BodyCell 组合验证）：
              ① <strong>fixed sticky</strong>（M2，Switch 切到 fixed 时 Name 列横向 sticky 定位）；
              ② <strong>ellipsis CSS 类</strong>（S20，Name 列 <code>dg-cell-ellipsis</code> + native title）；
              ③ <strong>树形内容前缀</strong>（S13，首列缩进 <code>level × indentSize</code> + 展开图标 ▶/▼）；
              ④ <strong>rowSelection</strong>（M5，前置哨兵列 columnWidth:100）。
              四者作用于不同层面（定位 / CSS 类 / 内容 / 列），不冲突。
            </li>
            <li>
              <strong>Fixed 开关（核心）</strong>：共享 state 同时驱动两侧——切换 Name 列 fixed
              true/false，横向滚动时观察两侧固定行为是否一致。
            </li>
            <li>
              <strong>checkStrictly 默认（§9 S13/S25，已核对）</strong>：antd 6.4.4 默认
              <strong> true</strong>（父子独立勾选）。本 demo 两侧 rowSelection 均未显式传
              checkStrictly（官方 demo 与左右两栏均只传 <code>columnWidth:100</code>）→ 两侧都走
              默认 true，<strong>行为一致</strong>，无需显式同传对齐。
            </li>
            <li>
              <strong>ellipsis 视觉对齐</strong>（§11 第 0 步 C1 修复后已对齐）：data-grid
              <code>derivedTableLayout</code> 隐式派生 <code>tableLayout:'fixed'</code>（首列 ellipsis）+
              无 width 列 <code>minmax(0,1fr)</code> → Name 列超长树名稳定省略号 <code>...</code>，
              与 antd <code>&lt;table&gt;</code> + tableLayout:fixed 一致。
            </li>
            <li>
              <strong>决策 2</strong>：树形展开行视为普通表格行（虚拟路径同样被 RO 实测，measured-first + 约定兜底）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
