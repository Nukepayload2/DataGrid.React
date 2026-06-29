/**
 * 复刻 antd `bordered` demo：`G:\Projects\ant-design\components\table\demo\bordered.tsx`。
 *
 * 双栏对照，两个示例：
 * - 示例 1（antd 官方 bordered demo）：3 列 + title 'Header' + footer 'Footer'。
 * - 示例 2：bordered + fixed 组合，验证固定列在 bordered 模式下竖向边框完整。
 *
 * 顶部 `Bordered` 开关（初值 true）同一 state 同时驱动两侧 + 两示例。
 * 共享数据见 `_compare/bordered.shared.ts`。
 */

import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import { BorderedTitleFooterDg, BorderedFixedDg } from './bordered.dg'
import { BorderedTitleFooterAntd, BorderedFixedAntd } from './bordered.antd'

// Demo 根组件

export default function BorderedDemo() {
  // 同一个 bordered 同时驱动两侧 + 两示例，父控制条直接读写。
  const [bordered, setBordered] = useState(true)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
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

      {/* 示例 1：bordered + title/footer（复刻 antd 官方 bordered demo）*/}
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 1：bordered + title/footer（antd 官方 bordered demo）
        </h3>
        <SplitDemo
          minPaneWidth={600}
          left={<BorderedTitleFooterDg bordered={bordered} virtual={virtual} />}
          right={<BorderedTitleFooterAntd bordered={bordered} virtual={virtual} />}
        >
          <div>
            <strong>对照说明：</strong>示例 1，bordered + title/footer。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>有 footer 时底部圆角</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：有 footer 时，表格四角圆角
                    （<code>border-radius: var(--dg-radius)</code>）。两侧一致（无差异）。</li>
                  <li><strong>触发条件</strong>：表格设了 <code>footer</code> 且 bordered 开启。</li>
                  <li><strong>差异原因</strong>：无差异。antd <code>.ant-table-footer</code> 在有 footer 时
                    去掉自身顶圆角、补底圆角配合 <code>.ant-table</code> 顶圆角实现四角圆；data-grid 用
                    <code>.dg-wrapper:has(.dg-footer)</code> 整框四角圆对齐。详见{' '}
                    <code>docs/design-notes/bordered.md</code>。</li>
                </ul>
              </li>
              <li>
                <strong>Cash Assets 列（.column-money）</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：antd demo 此列带 <code>className:'column-money'</code>，
                    两侧均无视觉高亮（无差异）。<code>align</code> 两栏等价
                    （data-grid <code>'end'</code> = antd <code>'right'</code>）。</li>
                  <li><strong>触发条件</strong>：始终。</li>
                  <li><strong>差异原因</strong>：无差异。antd Table 未定义 <code>.column-money</code> CSS
                    规则，该 className 是演示 <code>column.className</code> 透传机制的 placeholder，antd 自身
                    不消费；data-grid 同样只透传不消费。详见 <code>docs/design-notes/bordered.md</code>。</li>
                </ul>
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>

      {/* 示例 2：bordered + fixed 组合（验证固定列边框完整）*/}
      <div>
        <h3 style={{ margin: '0 0 12px' }}>
          示例 2：bordered + fixed 组合（验证固定列边框完整）
        </h3>
        <SplitDemo
          minPaneWidth={600}
          left={<BorderedFixedDg bordered={bordered} virtual={virtual} />}
          right={<BorderedFixedAntd bordered={bordered} virtual={virtual} />}
        >
          <div>
            <strong>对照说明：</strong>示例 2，bordered + fixed 组合。
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                <strong>固定列组合边框</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：Full Name+Age 左固定、Action 右固定，bordered 模式下
                    两侧竖向边框均完整（无差异）。</li>
                  <li><strong>触发条件</strong>：bordered 开启 + 横滚到固定列边界。</li>
                  <li><strong>差异原因</strong>：无差异。data-grid 主动给 fixed-end 边界格补
                    <code>border-inline-start</code>（修正 sticky 列缺左 border 的情形），antd 原生即正确。
                    两侧均边界完整。详见 <code>docs/design-notes/bordered.md</code>。</li>
                </ul>
              </li>
              <li>
                <strong>fixed 取值差异</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li><strong>差异行为</strong>：data-grid 用逻辑属性 <code>'start'/'end'</code>，
                    antd demo 用 <code>'left'/'right'</code>。视觉等价。</li>
                  <li><strong>触发条件</strong>：始终（列定义写死）。</li>
                  <li><strong>差异原因</strong>：data-grid 用 CSS 逻辑属性以 RTL 自动适配，antd demo
                    沿用物理值。</li>
                </ul>
              </li>
            </ul>
          </div>
        </SplitDemo>
      </div>
    </div>
  )
}
