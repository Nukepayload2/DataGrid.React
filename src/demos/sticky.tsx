import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import StickyDg from './sticky.dg'
import StickyAntd from './sticky.antd'

export default function StickyDemo() {
  const [summaryFixed, setSummaryFixed] = useState(false)
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
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

      <SplitDemo
        minPaneWidth={900}
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

      <p style={{ padding: '16px 0', color: token.colorTextSecondary }}>
        表格内部滚动到底部 — 两侧表头均钉在表格容器顶部（容器内固定表头，适配 app-shell）。
      </p>
    </div>
  )
}
