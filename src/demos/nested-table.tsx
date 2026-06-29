/**
 * 复刻 antd `nested-table` demo：
 *   `G:\Projects\ant-design\components\table\demo\nested-table.tsx`
 *
 * 双栏对照：expandedRowRender 返回嵌套子 Table + defaultExpandedRowKeys: ['0'] + size 切换。
 * 顶部 `Segmented` size（large/medium/small）同时驱动两侧主表（antd demo 原本三表静态展示，
 * 双栏下改为单表 + size 切换，对照同一档 size 更直观）。共享数据见 `_compare/nested-table.shared.ts`。
 */

import { useState } from 'react'
import { Segmented, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import NestedTableDg from './nested-table.dg'
import NestedTableAntd from './nested-table.antd'

// 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受
// （data-grid 用 'medium'（= 'middle'）；antd v6 也接受 'medium' 别名（= 'middle'））。
type SharedSize = 'large' | 'medium' | 'small'

// Demo 根组件

export default function NestedTableDemo() {
  // 同一个 size 同时驱动两侧主表，父控制条直接读写。
  const [size, setSize] = useState<SharedSize>('large')
  // virtual 仅加在外层主表；内层子表（expandedRowRender 返回的）是展开内容，保持非虚拟。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
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
              <strong>嵌套子表实现差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏子表是 data-grid <code>&lt;Table&gt;</code>；
                  右栏子表是真实 antd <code>&lt;Table&gt;</code>。两者渲染各自的表格样式。</li>
                <li><strong>触发条件</strong>：展开任意行（初始 key='0' 的行默认展开）。</li>
                <li><strong>差异原因</strong>：data-grid 的 <code>expandedRowRender</code> 把返回内容
                  放进 <code>dg-row-expanded</code>（grid-column: 1 / -1 跨整行），其中嵌套的
                  <code>&lt;Table&gt;</code> 是独立实例（自己 columns/dataSource/size），与主表正交，
                  能正常渲染。详见 <code>docs/design-notes/expand.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>size 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：中等档 data-grid 用 <code>medium</code>、antd demo
                  用 <code>middle</code>。两者视觉等价。</li>
                <li><strong>触发条件</strong>：size 切到中间档。</li>
                <li><strong>差异原因</strong>：data-grid 的 <code>SizeType</code> 接受 <code>medium</code>
                  作为 <code>middle</code> 的别名；antd v6 也兼容 <code>medium</code> 别名。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
