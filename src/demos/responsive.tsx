/**
 * 复刻 antd `responsive` demo：
 *   `G:\Projects\ant-design\components\table\demo\responsive.tsx`
 *
 * === S28 落地说明 ===
 *
 * - `column.responsive: Breakpoint[]`：按视口断点显隐列（对齐 antd `column.responsive`）。
 * - 断点检测用 antd `Grid.useBreakpoint`（决策 6：响应式检测用 antd）。`screens[bp]===true`
 *   表示当前视口 >= bp，故 `responsive: ['md']` 实际语义是 **md 及以上显示**
 *   （与 antd responsive demo 注释 "medium screen or bigger" 一致）。
 *
 * 3 列：
 *   - Name（render `<a>`，**无 responsive** → 所有视口始终显示）。
 *   - Age（`responsive: ['md']` → md 及以上显示；<md 视口隐藏）。
 *   - Address（`responsive: ['lg']` → lg 及以上显示；<lg 视口隐藏）。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（column.responsive 字段 + 引擎 needResponsive
 *   订阅 useBreakpoint + visibleColumns 过滤）。
 * - **右栏（antd Table）**：忠实复刻 antd responsive demo（antd 原生 column.responsive）。
 * - **共享控制条**：`Bordered` 开关 + 当前断点状态提示（响应式靠视口宽度自然驱动，无需额外控制）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/responsive.shared.ts`。
 *
 * === 两侧保留的差异 ===
 *
 * data-grid 与 antd 都用 antd `Grid.useBreakpoint` 检测断点（data-grid 引擎 Table.tsx:1297 内部
 * 订阅；antd Table 内部 responsiveObserver 订阅），故两侧列显隐切换应完全同步。
 * 调整浏览器视口宽度对照：≥lg 三列全显；md（<lg）Name+Age；<md 仅 Name。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：bordered state + useVirtualization + DemoToolbar(Switch Bordered +
 * 断点提示) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX + 列定义拆到子文件：
 *   - `./responsive.dg`：`ResponsiveDg({bordered, virtual})`（左栏）
 *   - `./responsive.antd`：`ResponsiveAntd({bordered, virtual})`（右栏）
 *
 * ★ useBreakpoint 位置说明：父组件保留 `Grid.useBreakpoint()` 调用——仅服务于控制条 UI 的
 *   「当前断点状态」提示 span（响应式检测本身不需要父介入：data-grid 引擎内部 Table.tsx:1297
 *   自带订阅，antd Table 内部 responsiveObserver 自带订阅；两侧自动同步）。Grid.useBreakpoint
 *   属 antd scope（合法）。
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `ResponsiveDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Grid, Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（props 驱动）。RecordType/data
//   现在由子文件各自 import responsive.shared，父文件不再需要。
import ResponsiveDg from './responsive.dg'
import ResponsiveAntd from './responsive.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ResponsiveDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（原 responsive demo 无 scroll，
  // ON 用 dg {y:true}/antd {y:280}；OFF 回 undefined，行为与改造前一致）。
  const { virtual } = useVirtualization()

  // 两侧都用 antd Grid.useBreakpoint 检测断点（决策 6：响应式检测用 antd）。
  // 这里父组件调用仅用于控制条 UI 提示（data-grid 引擎 + antd Table 各自内部也已订阅，
  // 列显隐不依赖此调用）。
  const screens = Grid.useBreakpoint()
  // 控制条 chrome 文字色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)），暗主题自适应。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            Current breakpoints: md={screens.md ? '✓' : '✗'} lg={screens.lg ? '✓' : '✗'}
            （调整视口宽度对照列显隐）
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，1-3 列视断点，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<ResponsiveDg bordered={bordered} virtual={virtual} />}
        right={<ResponsiveAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd responsive demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>column.responsive</strong>：Age <code>responsive:['md']</code>（md+ 显示）；
              Address <code>responsive:['lg']</code>（lg+ 显示）。
            </li>
            <li>
              <strong>断点检测</strong>：两侧都用 antd <code>Grid.useBreakpoint</code>，列显隐应完全同步。
            </li>
            <li>
              <strong>对照方式</strong>：调整浏览器视口宽度——≥lg（≥992px）三列全显；md（768–991px）
              Name+Age；&lt;md（&lt;768px）仅 Name。两栏应同时切换。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
