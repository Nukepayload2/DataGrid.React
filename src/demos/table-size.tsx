import { useState } from 'react'
import { Segmented, Space } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import SizeDg from './table-size.dg'
import SizeAntd from './table-size.antd'

// Share one middle-size spelling across both panes.
type SharedSize = 'large' | 'medium' | 'small'

// Demo 根组件

export default function SizeDemo() {
  // 同一个 size 同时驱动两侧表格，父控制条直接读写。
  const [size, setSize] = useState<SharedSize>('medium')
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space>
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SharedSize)}
            options={[
              { label: 'large', value: 'large' },
              { label: 'medium', value: 'medium' },
              { label: 'small', value: 'small' },
            ]}
          />
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={<SizeDg size={size} virtual={virtual} />}
        right={<SizeAntd size={size} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd size demo，共享 Segmented 切换 size 档位。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>size 取值</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：中等档两侧都传 <code>'medium'</code>（antd v6 SizeType
                  含 <code>'medium'</code>；遗留写法 <code>'middle'</code> 由 antd 内部归一为
                  <code>'medium'</code>）。两侧行高/padding 一致。</li>
                <li><strong>触发条件</strong>：size 切到中间档。</li>
              </ul>
            </li>
            <li>
              <strong>demo 结构差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：本 demo 为单表 + Segmented 切换 size；antd 原始 demo
                  是 Divider 分隔的双表静态展示（medium + small）。</li>
                <li><strong>触发条件</strong>：始终（双栏对照结构）。</li>
                <li><strong>说明</strong>：本 demo 使用单表 + size 切换，便于对照同一档 size。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
