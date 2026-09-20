import { useState } from 'react'
import { Segmented, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import NestedTableDg from './nested-table.dg'
import NestedTableAntd from './nested-table.antd'

type SharedSize = 'large' | 'medium' | 'small'

export default function NestedTableDemo() {
  const [size, setSize] = useState<SharedSize>('large')
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

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
          <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            size 同时驱动两侧主表
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={<NestedTableDg size={size} virtual={virtual} />}
        right={<NestedTableAntd size={size} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd nested-table demo
          （expandedRowRender 返回嵌套子 Table + defaultExpandedRowKeys: ['0'] + size 切换）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>嵌套子表</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏子表是 data-grid <code>&lt;Table&gt;</code>；
                  右栏子表是真实 antd <code>&lt;Table&gt;</code>。两者渲染各自的表格样式。</li>
                <li><strong>触发条件</strong>：展开任意行（初始 key='0' 的行默认展开）。</li>
                <li><strong>说明</strong>：展开内容可以放入一张独立子表，子表使用自己的 columns、dataSource 和 size。</li>
              </ul>
            </li>
            <li>
              <strong>size 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：中等档 data-grid 用 <code>medium</code>、antd demo
                  用 <code>middle</code>。两者视觉等价。</li>
                <li><strong>触发条件</strong>：size 切到中间档。</li>
                <li><strong>说明</strong>：<code>medium</code> 和 <code>middle</code> 在这里视觉等价。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
