/**
 * 复刻 antd `size` demo：`G:\Projects\ant-design\components\table\demo\size.tsx`。
 *
 * 双栏对照：`Segmented` size（large/medium/small）同一 state 同时驱动两侧，对照同一档 size
 * 下两侧行高/padding 差异（antd demo 原本双表静态展示，双栏下改为单表 + size 切换）。
 * 共享数据/列见 `_compare/size.shared.ts`。
 */

import { useState } from 'react'
import { Segmented, Space } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import SizeDg from './size.dg'
import SizeAntd from './size.antd'

// 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受
// （data-grid 用 'medium'（= 'middle'）；antd v6 也接受 'medium' 别名（= 'middle'））。
type SharedSize = 'large' | 'medium' | 'small'

// Demo 根组件

export default function SizeDemo() {
  // 同一个 size 同时驱动两侧表格，父控制条直接读写。
  const [size, setSize] = useState<SharedSize>('medium')
  const { virtual } = useVirtualization()

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
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={<SizeDg size={size} virtual={virtual} />}
        right={<SizeAntd size={size} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd size demo，共享 Segmented 切换 size 档位。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>size 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：中等档 data-grid 用 <code>medium</code>、antd demo
                  用 <code>middle</code>。两侧行高/padding 视觉等价（medium = middle = 12/8）。</li>
                <li><strong>触发条件</strong>：size 切到中间档。</li>
                <li><strong>差异原因</strong>：data-grid 的 <code>SizeType</code> 接受 <code>medium</code>
                  作为 <code>middle</code> 的别名；antd v6 也兼容 <code>medium</code> 别名。</li>
              </ul>
            </li>
            <li>
              <strong>demo 结构差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：本 demo 为单表 + Segmented 切换 size；antd 原始 demo
                  是 Divider 分隔的双表静态展示（medium + small）。</li>
                <li><strong>触发条件</strong>：始终（双栏对照结构）。</li>
                <li><strong>差异原因</strong>：双栏对照下双表结构会变成 4 张表，对照不便，故改为单表 +
                  size 切换以对照同一档 size 两侧差异。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
