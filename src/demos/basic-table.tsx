import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import BasicDg from './basic-table.dg'
import BasicAntd from './basic-table.antd'

export default function BasicDemo() {
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
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

      
      <SplitDemo
        minPaneWidth={480}
        left={<BasicDg bordered={bordered} virtual={virtual} />}
        right={<BasicAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd basic demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Tag 列</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 侧的 Tags 列是 demo 里手写的最小 Tag
                  （预设色 geekblue/green/volcano + 边框/背景）；antd 侧用内置
                  <code>&lt;Tag&gt;</code>。</li>
                <li><strong>触发条件</strong>：Tags 列渲染（任意行）。</li>
                <li><strong>差异原因</strong>：两栏的 Tags 列都由 demo 文件编写；data-grid 侧没有复用
                  antd <code>&lt;Tag&gt;</code>，外观是手写的；antd 侧直接用内置组件。</li>
              </ul>
            </li>
            <li>
              <strong>Action 布局</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 用内联 <code>&lt;span style=&#123;display:'inline-flex',
                  gap:8&#125;&gt;</code> 排「Invite/Delete」链接；antd 用
                  <code>&lt;Space size="medium"&gt;</code>。</li>
                <li><strong>触发条件</strong>：Action 列渲染（任意行）。</li>
                <li><strong>差异原因</strong>：data-grid 用内联 flex + 8px gap（未引入 antd Space）；antd
                  Space medium 的列间距为 16px，两侧间距不等价。antd 复刻官方 demo 的 Action 列写法。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

