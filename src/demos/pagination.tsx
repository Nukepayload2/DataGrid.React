import { useState } from 'react'
import { Radio } from 'antd'
import type { CheckboxOptionType } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import {
  placementOptions,
  type TablePaginationPlacement,
} from './_compare/pagination.shared'
import { useVirtualization } from './VirtualizationContext'
import PaginationDg from './pagination.dg'
import PaginationAntd from './pagination.antd'

export default function PaginationDemo() {
  const [placement, setPlacement] = useState<TablePaginationPlacement>('bottomEnd')
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Radio.Group
          options={placementOptions as CheckboxOptionType[]}
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
        />
      </DemoToolbar>
      <SplitDemo
        minPaneWidth={480}
        left={<PaginationDg placement={placement} virtual={virtual} />}
        right={<PaginationAntd placement={placement} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd 分页 demo。顶部
          <code> Radio.Group</code>（6 位置 + <code>none</code> 互斥）共享驱动两侧分页器位置
          （单元素数组 = 单翻页器）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>分页默认行为</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>行为</strong>：data-grid 与 antd 都在不传 <code>pagination</code> 时默认开启分页
                  （<code>defaultPageSize: 10</code>、<code>placement: 'bottomEnd'</code>）。</li>
                <li><strong>触发条件</strong>：未显式传 <code>pagination</code> prop。</li>
                <li><strong>说明</strong>：本 demo 显式传 <code>pagination</code> 对象是为了测试
                  <code>placement</code>，不是为了开启分页。</li>
              </ul>
            </li>
            <li>
              <strong>placement 单元素数组 = 单翻页器</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 与 antd v6 一致，<code>placement</code> 是数组语义；
                  本 demo 传单元素数组（如 <code>['topStart']</code>）→ 该位置渲染唯一翻页器。
                  <code>'none'</code> → 该侧不渲染。</li>
                <li><strong>触发条件</strong>：切换顶部 <code>Radio.Group</code> 任一位置选项。</li>
                <li><strong>说明</strong>：<code>placement</code> 使用数组写法；单元素数组表示只在一个位置渲染分页器。</li>
              </ul>
            </li>
            <li>
              <strong>pageSize 与行数</strong>：两侧 <code>defaultPageSize: 10</code> + 3 行 → 单页，
              翻页器仍渲染以演示 placement 位置切换。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
