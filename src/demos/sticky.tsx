/**
 * 复刻 antd `sticky` demo：
 *   `G:\Projects\ant-design\components\table\demo\sticky.tsx`
 *
 * antd 原版要素：
 *   - 100 行（Edward 0..99，age 32，address London Park no. i）。
 *   - 11 列：Full Name（fixed start, 100）/ Age（fixed start, 100）/ Column 1..8（address，150/.../auto）/
 *     Action（fixed end, 100，render `<a>action</a>`）。
 *   - `scroll={{ x: 1500 }}` 横向滚动。
 *   - `summary`：单行，Switch 切换 fixed top/bottom + "Scroll Context" + "Fix Right"。
 *
 * 双栏对照（容器内固定表头，适配 app-shell）：
 * - 左栏（data-grid Table）：容器内固定表头（`scroll={{ x: 1500, y: true }}`，父容器 height:500）+
 *   fixed 列 + summary fixed（Switch on/off）。
 * - 右栏（antd Table）：忠实复刻 antd 官方 sticky demo 的列结构与 summary（同列结构 + summary
 *   fixed top/bottom Switch + 100 行），用 `scroll={{ x: 1500, y: 400 }}`（antd 接受数字 y）。
 * - 共享控制条：`Summary Fixed` 开关（同一状态）同时驱动两侧 summary 的 fixed 行为。共享数据见
 *   `_compare/sticky.shared.ts`。
 *
 * 容器内固定表头由页面级 sticky 改造 — 详见 docs/design-notes/sticky.md
 */

import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import StickyDg from './sticky.dg'
import StickyAntd from './sticky.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function StickyDemo() {
  // 共享状态：同一个状态同时驱动两侧 summary 的 fixed 行为。
  // 左栏 data-grid：summaryFixed true/false（on/off）。
  // 右栏 antd：fixedTop true→'top' / false→'bottom'（忠实 antd demo 顶/底切换）。
  const [summaryFixed, setSummaryFixed] = useState(false)
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部说明区：讲解容器内固定表头行为，适配 app-shell（Content 内滚，无页面滚动）。 */}
      <p style={{ color: token.colorTextSecondary }}>
        容器内固定表头（适配 app-shell）：滚动<strong>表格内部</strong>，两侧表头都会钉在表格容器顶部
        （左栏 data-grid <code>scroll.y: true</code> + 父容器 <code>height:500</code>；右栏 antd
        <code>scroll.y: 400</code>；表体在容器内滚动）；横向滚动表格内部查看 fixed 列。
        共享「Summary Fixed」开关同时驱动两侧 summary 的 fixed 行为。
      </p>

      <DemoToolbar>
        <Space wrap>
          <Switch
            checkedChildren="Summary Fixed"
            unCheckedChildren="Summary Fixed"
            checked={summaryFixed}
            onChange={setSummaryFixed}
          />
          <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            左栏 data-grid：on/off；右栏 antd：top/bottom（功能等价）
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:1500 的宽表（11 列），半宽（~960px at 1920 视口）下每栏仅 ~480px
        太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**（每栏全宽，对 1500px
        宽表 + 容器内固定表头更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        // virtualizable={false}：聚焦容器内固定表头演示，不接入全局「Virtual」开关，
        // 避免虚拟化引入额外变量干扰 sticky 表头对照。
        virtualizable={false}
        left={
          <StickyDg
            summaryFixed={summaryFixed}
            onSummaryFixedChange={setSummaryFixed}
          />
        }
        right={
          <StickyAntd
            summaryFixed={summaryFixed}
            onSummaryFixedChange={setSummaryFixed}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd 表格。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>scroll.y 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用 <code>{'scroll={{ x: 1500, y: true }}'}</code>
                  （布尔，需父容器明确高度，故外包 <code>{'<div style={{ height: 500 }}>'}</code>）；
                  右栏 antd 用 <code>{'scroll={{ x: 1500, y: 400 }}'}</code>（数字，max-height 语义）。
                  两侧视觉等价（表头钉容器顶 + 表体内部滚动）。</li>
                <li><strong>触发条件</strong>：表格进入容器内固定表头模式（表体在容器内滚动）即出现。</li>
                <li><strong>差异原因</strong>：app-shell 下无页面滚动，原 antd 页面级 sticky
                  （表头相对 viewport 固定、靠 window scroll 驱动）失效，故两侧均改为容器内固定表头。
                  data-grid 用纯 CSS flex 自适应高度（<code>y:true</code> 仅支持布尔），antd 用 rc-table
                  max-height。详见 <code>docs/design-notes/sticky.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>summary fixed 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：右栏 antd 用
                  <code>fixed: fixedTop ? 'top' : 'bottom'</code>（顶/底切换）；左栏 data-grid 的
                  <code>fixed</code> 仅 boolean（on/off，仅 sticky bottom，不支持 'top'）。</li>
                <li><strong>触发条件</strong>：切换共享「Summary Fixed」开关时。</li>
                <li><strong>差异原因</strong>：data-grid summary 的 <code>fixed</code> 类型简化为 boolean，
                  antd 支持 'top'/'bottom' 字符串。功能等价（summary fixed 在 grid 内，与容器内固定表头共存）。</li>
              </ul>
            </li>
            <li>
              <strong>虚拟化开关未接入</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：本 demo 不响应全局「Virtual」开关，两侧始终非虚拟。</li>
                <li><strong>触发条件</strong>：切换全局虚拟化开关时（本 demo 不变）。</li>
                <li><strong>差异原因</strong>：聚焦容器内固定表头对照，避免虚拟化引入额外变量干扰。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>

      {/* 底部说明区：表格内部滚动到底部时表头仍钉在容器顶部。 */}
      <p style={{ padding: '16px 0', color: token.colorTextSecondary }}>
        表格内部滚动到底部 — 两侧表头均钉在表格容器顶部（容器内固定表头，适配 app-shell）。
      </p>
    </div>
  )
}
