/**
 * 复刻 antd `bordered` demo：`G:\Projects\ant-design\components\table\demo\bordered.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（S26 实现：`bordered` 表格外边框 + 单元格
 *   竖线 + title/footer；固定列组合下边框完整——bordered 模式给 fixed-end 边界格补
 *   border-inline-start，避免 lun 「右 sticky 列缺左 border」缺陷）。
 * - **右栏（antd Table）**：忠实复刻 antd bordered demo（antd 原生 bordered + title/footer）。
 * - **共享控制条**：`Bordered` 开关（初值 true，对齐 antd demo）同时驱动两侧 + 示例 1/示例 2。
 * - **共享数据**：`RowType`/`FixedRow` + `data`/`fixedData` 见 `_compare/bordered.shared.ts`。
 *
 * === 两示例（照 antd demo 结构 + data-grid S26 对照扩展）===
 *
 * - **示例 1**（antd 官方 `bordered.tsx`）：3 列（Name render `<a>` / Cash Assets align right
 *   className 'column-money' / Address）+ title 'Header' + footer 'Footer'。
 * - **示例 2**（data-grid S26 新增对照）：bordered + fixed 组合——Full Name+Age 左固定、
 *   Column 1..5 中间、Action 右固定 + scroll.x。验证固定列在 bordered 模式下竖向边框完整。
 *
 * === 两侧保留并如实呈现的差异（含 §9 B4 遗留 .column-money 注释失真更正）===
 *
 * - **示例 1 Cash Assets 列**：antd demo 用 `className: 'column-money'`（demo 自定义 CSS 类）+
 *   `align:'right'`。
 *   - ★ **§9 B4 注释失真更正**：此前注释称「右栏 antd 金额列有 antd 内置 `.column-money` 样式高亮」，
 *     经 antd 源码核实为**误判**——antd Table **未定义任何 `.column-money` CSS 规则**
 *     （`G:\Projects\ant-design` 全仓搜 `column-money` 仅命中本 bordered demo 源码 + snapshot，无 style
 *     定义）。该 className 是 antd demo **示例性 placeholder**（演示 `column.className` 透传机制），
 *     antd 自身不消费它——**两栏均无视觉高亮**（右栏 antd 也无）。原注释「左栏无/右栏有」对照点不存在。
 *   - 两栏实际行为：`.column-money` className 在两侧都透传到 DOM（antd 原生 + data-grid 接口全兼容
 *     阶段已支持 column.className），但都无对应 CSS → **两侧均无视觉高亮**，**无差异**。
 *   - `align` 差异：data-grid 用逻辑属性 `'end'`（等价 antd `'right'`，RTL 自动适配），两栏视觉等价。
 * - **示例 2 固定列边框**：data-grid S26 主动补 border-inline-start 修正 lun 缺陷；antd 原生正确。
 *   两侧均应边框完整，对照验证 data-grid 修正生效。
 *
 * === 拆子文件（task S26 live 编辑接入，summary 双轨多示例模式）===
 *
 * 父文件只保留「外壳职责」：bordered state + useVirtualization + DemoToolbar(Switch Bordered)
 * + 两个 SplitDemo（示例1 / 示例2 各一对左右栏）+ children 对照说明 + 底部说明区。两侧表格 JSX
 * + columns 拆到子文件：
 *   - `./bordered.dg`：导出 `BorderedTitleFooterDg` / `BorderedFixedDg`（命名，父按示例选用）+
 *     `BorderedDg`（默认，live 编辑用）。
 *   - `./bordered.antd`：导出 `BorderedTitleFooterAntd` / `BorderedFixedAntd`（命名）+
 *     `BorderedAntd`（默认，live 编辑用）。
 *
 * ★ 状态提升说明：bordered 必须留父——父渲染顶部 Switch Bordered 控制条需直接读写它；
 *   且同一 state 驱动两示例 + 两侧同步。virtual 是顶栏全局开关（useVirtualization）。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `BorderedDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件默认导出并按 editedDg/editedAntd 替换
 * （编辑态展示单侧两示例堆叠，不对照——Phase 1 简化）。
 */

import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（props 驱动）。RowType/FixedRow/data/fixedData
//   现在由子文件各自 import bordered.shared；父文件不再需要。
//   父按示例分别取命名导出（示例1 / 示例2 各一对左右栏）。
import { BorderedTitleFooterDg, BorderedFixedDg } from './bordered.dg'
import { BorderedTitleFooterAntd, BorderedFixedAntd } from './bordered.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function BorderedDemo() {
  // ★ 共享状态：同一个 bordered 同时驱动两侧 + 示例 1/示例 2（初值 true 对齐 antd demo）。
  const [bordered, setBordered] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏（含示例 1/示例 2）叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()
  // 控制条 chrome 文字色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)），暗主题自适应。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ★ 共享控制条：全宽，在最上方。同一个 bordered 状态同时驱动两侧 + 两示例。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。
          外层容器用 gap:24 控制间距，故 DemoToolbar marginBottom 清零避免双重间距。 */}
      <DemoToolbar style={{ marginBottom: 0 }}>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            同时驱动下方两示例左右两栏
          </span>
        </Space>
      </DemoToolbar>

      {/* === 示例 1：bordered + title/footer（复刻 antd 官方 bordered demo）=== */}
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 1：bordered + title/footer（antd 官方 bordered demo）
        </h3>
        {/*
          minPaneWidth=600（示例 1 窄表 3 列，但含 title/footer，略宽于 basic 480）→ 横排阈值 ≈ 1216。
          常规笔记本视口（≥1280）横排。
        */}
        <SplitDemo
          minPaneWidth={600}
          left={<BorderedTitleFooterDg bordered={bordered} virtual={virtual} />}
          right={<BorderedTitleFooterAntd bordered={bordered} virtual={virtual} />}
        >
          <div>
            <strong>对照说明（示例 1，决策 9 T1）：</strong>bordered + title/footer。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>bordered 外边框</strong>：data-grid <code>.dg-wrapper.dg-bordered</code> 整框
                <code>var(--dg-border)</code>（= antd <code>tableBorder = 1px solid #f0f0f0</code>，
                桥接 <code>--ant-line-width</code>/<code>--ant-line-type</code>/<code>--ant-table-border-color</code>，
                跟随主题）。antd 外框由 title/container/footer 三部分拼成（bordered.ts:43-52），data-grid 简化为
                整框 + title/footer 仅画分隔线，视觉等价。两侧外框 color/width/style 一致。
              </li>
              <li>
                <strong>bordered 单元格竖线</strong>：每个 cell（含末列）<code>border-inline-end</code> = 同
                <code>--dg-border</code> token（antd bordered.ts:57-60 所有 th/td 均设 borderInlineEnd）。
                表头竖线与表体竖线统一 token（无单独表头/表体竖线 token）。两侧竖线 color/width 一致。
              </li>
              <li>
                <strong>表头 ::before 抑制</strong>：bordered 模式表头分隔竖线（非 bordered 的
                <code>[data-leaf-index]::before</code>）被抑制（<code>background-color: transparent !important</code>，
                对齐 antd bordered.ts:68-71），避免与 cell border-inline-end 双线。两侧表头仅 cell border 竖线。
              </li>
              <li>
                <strong>title/footer 边框</strong>：上方 dg-title（bordered 加 border-bottom 分隔线）+ 下方 dg-footer
                （bordered 加 border-top 分隔线）。两侧均应渲染 'Header' / 'Footer'，中间分隔线 color/width 一致。
              </li>
              <li>
                <strong>★ 有 footer 时底部圆角</strong>（§11 bordered 修复）：antd radius.ts:61-63
                <code>.ant-table-footer {'{'} borderRadius: 0 0 tableRadius tableRadius {'}'}</code> 配合
                <code>.ant-table</code> 顶圆角，有 footer 时表格**四角圆角**。data-grid 此前 .dg-wrapper 仅顶圆
                （<code>border-radius: var(--dg-radius) var(--dg-radius) 0 0</code>），有 footer 时底部直角与 antd 不符。
                修复：<code>.dg-wrapper:has(.dg-footer) {'{'} border-radius: var(--dg-radius) {'}'}</code>（四角圆）。
                示例 1 有 footer → 两侧底边均应圆角 8px（= tableRadius = borderRadiusLG）。
              </li>
              <li>
                <strong>Cash Assets 列（.column-money）</strong>：antd demo <code>className:'column-money'</code>
                + <code>align:'right'</code>。★ <strong>§9 B4 注释失真更正</strong>：antd Table 未定义
                <code>.column-money</code> CSS 规则（全仓搜仅命中 demo 源码 + snapshot），该 className 是演示
                <code>column.className</code> 透传机制的 placeholder，antd 自身不消费——<strong>两栏均无视觉高亮</strong>
                （原注释「左栏无/右栏有」对照点不存在，已更正）。className 在两栏都正常透传到 DOM，
                仅无对应 CSS 消费（两侧等价无差异）。align 两栏等价（data-grid <code>'end'</code> = antd <code>'right'</code>）。
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>

      {/* === 示例 2：bordered + fixed 组合（data-grid S26 对照）=== */}
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 2：bordered + fixed 组合（验证固定列边框完整）
        </h3>
        {/*
          minPaneWidth=600（示例 2 含 fixed + scroll.x:max-content，8 列横向滚动，略宽于 480）→
          横排阈值 ≈ 1216。常规笔记本视口（≥1280）横排；窄视口竖排。
        */}
        <SplitDemo
          minPaneWidth={600}
          left={<BorderedFixedDg bordered={bordered} virtual={virtual} />}
          right={<BorderedFixedAntd bordered={bordered} virtual={virtual} />}
        >
          <div>
            <strong>对照说明（示例 2，决策 9 T1）：</strong>bordered + fixed 组合。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>固定列组合边框</strong>：Full Name+Age 左固定、Action 右固定，bordered 模式下
                竖向边框完整。<strong>左栏 data-grid</strong>：S26 主动补 <code>border-inline-start</code>
                给 fixed-end 边界格（.dg-sticky-shadow-end，修正 lun 「右 sticky 列缺左 border」缺陷）+
                <code>border-inline-end</code> 给 fixed-start 边界格（.dg-sticky-shadow-start，防御性）。
                <strong>右栏 antd</strong>：bordered.ts:74-78 仅给 fix-right-first::after 补 borderInlineEnd
                （fix-left-last 作为普通 cell 已有 borderInlineEnd，不需特殊处理）。data-grid 的 fixed-start
                补全为冗余（border 重叠），视觉等价 antd。两侧均应边界完整。
              </li>
              <li>
                <strong>fixed 取值差异</strong>：data-grid 用逻辑属性 <code>'start'/'end'</code>
                （等价 antd <code>'left'/'right'</code>，RTL 自动适配）。
              </li>
              <li>
                <strong>横向滚动</strong>：<code>scroll: {'{ x: "max-content" }'}</code>，两侧均可横滚，
                固定列 sticky。横滚到尽头边界完整（左固定集群右边缘 + 右固定集群左边缘均有竖线）。
              </li>
              <li>
                <strong>无 footer 时底部直角</strong>（与示例 1 对照）：本示例无 footer，表格底部
                = 末行 cell border-bottom + .dg-wrapper 底框（border-box 重叠，1px），无圆角（:has(.dg-footer)
                不命中）。与 antd 无 footer 时底部直角一致（radius.ts 的 footer 圆角规则不触发）。
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>
    </div>
  )
}
