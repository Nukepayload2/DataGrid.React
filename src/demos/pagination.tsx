/**
 * 分页 placement 双栏对照 demo：顶部一个 `Radio.Group`（6 位置 + none 互斥选一）
 * 同步驱动左栏 data-grid 与右栏 antd Table 的分页器位置（placement 单元素数组 = 单翻页器）。
 */

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

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function PaginationDemo() {
  // 共享 placement（驱动顶部 Radio.Group + 两侧分页器位置），默认 bottomEnd（antd Table 真实默认）。
  const [placement, setPlacement] = useState<TablePaginationPlacement>('bottomEnd')
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/*
        顶部全宽控制条：Radio.Group（6 位置 + none 互斥），同一 state 驱动两侧 pagination.placement。
        DemoToolbar 用 useToken 适配主题。
      */}
      <DemoToolbar>
        <Radio.Group
          options={placementOptions as CheckboxOptionType[]}
          value={placement}
          onChange={(e) => setPlacement(e.target.value)}
        />
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，5 列无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
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
              <strong>分页默认行为差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 不传 <code>pagination</code> 时全量渲染、无翻页器；
                  antd <code>&lt;Table&gt;</code> 默认开启分页（<code>defaultPageSize: 10</code>、
                  <code>placement: 'bottomEnd'</code>）。</li>
                <li><strong>触发条件</strong>：未显式传 <code>pagination</code> prop。</li>
                <li><strong>差异原因</strong>：data-grid 把分页做成显式启用项（贴近「按需开启」语义），
                  antd 原生默认即渲染翻页器。本 demo 左栏显式传 <code>pagination</code> 对象对齐 antd 默认。</li>
              </ul>
            </li>
            <li>
              <strong>placement 单元素数组 = 单翻页器</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 与 antd v6 一致，<code>placement</code> 是数组语义；
                  本 demo 传单元素数组（如 <code>['topStart']</code>）→ 该位置渲染唯一翻页器。
                  <code>'none'</code> → 该侧不渲染。</li>
                <li><strong>触发条件</strong>：切换顶部 <code>Radio.Group</code> 任一位置选项。</li>
                <li><strong>差异原因</strong>：antd v6 把 placement 从单值扩成数组（支持双翻页器），data-grid
                  <code>pagination</code> 签名对齐 v6 <code>TablePaginationConfig</code>，单元素数组即等价「单翻页器在该位置」。</li>
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
