/**
 * basic 双栏对照 demo：同一 `Bordered` 开关 + 虚拟化开关同步驱动左栏 data-grid 与右栏 antd
 * Table，对照「有/无边框」两侧行为是否一致。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import BasicDg from './basic.dg'
import BasicAntd from './basic.antd'

export default function BasicDemo() {
  // 共享状态：同一个 bordered 同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
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
        minPaneWidth=480（窄表，3-5 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<BasicDg bordered={bordered} virtual={virtual} />}
        right={<BasicAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd basic demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Tag 实现</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用内联最小 Tag（手写预设色
                  geekblue/green/volcano 的色板 + 边框/背景）；右栏 antd 用原生
                  <code>&lt;Tag&gt;</code>（预设色内置）。</li>
                <li><strong>触发条件</strong>：Tags 列渲染（任意行）。</li>
                <li><strong>差异原因</strong>：data-grid 引擎本身不依赖 antd 本体的 Tag 组件，
                  demo 用内联最小实现还原外观；antd 侧直接用内置组件。</li>
              </ul>
            </li>
            <li>
              <strong>Action 布局</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏用内联 <code>&lt;span style=&#123;display:'inline-flex',
                  gap:8&#125;&gt;</code> 排「Invite/Delete」链接；右栏 antd 用
                  <code>&lt;Space size="medium"&gt;</code>。</li>
                <li><strong>触发条件</strong>：Action 列渲染（任意行）。</li>
                <li><strong>差异原因</strong>：左栏避免引入 antd Space，用 flex 还原相同间距；
                  antd 侧忠实复刻官方 demo。视觉等价。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
