/**
 * drag-sorting 双栏对照 demo：行拖拽排序。两侧各自维护 dataSource。
 * - 左栏 data-grid：自研 pointer 行拖拽（`useRowDragSort` + 蓝色指示线 + arrayMove）。
 * - 右栏 antd：忠实复刻官方 drag-sorting（@dnd-kit + restrictToVerticalAxis + useSortable + transform）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'
import DragSortingDg from './drag-sorting.dg'
import DragSortingAntd from './drag-sorting.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function DragSortingDemo() {
  // 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // autoScrollOnDrag 开关（仅驱动左栏 data-grid；antd 无对应概念）。
  const [autoScroll, setAutoScroll] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：Bordered + AutoScroll 开关。DemoToolbar 用 useToken 适配主题。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          {/* autoScrollOnDrag 开关（仅驱动左栏 data-grid）。 */}
          <Switch
            checked={autoScroll}
            onChange={setAutoScroll}
            checkedChildren="AutoScroll"
            unCheckedChildren="AutoScroll"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DragSortingDg bordered={bordered} autoScroll={autoScroll} virtual={virtual} />}
        right={<DragSortingAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid（自研 pointer 行拖拽）与 antd 官方
          drag-sorting（dnd-kit 行拖拽）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 拖拽中显示<strong>蓝色指示线</strong>
                  （被拖行原位不动，指示线提示插入位置，松手后重排）；antd 被拖行
                  <strong>跟随指针平移</strong>（transform），松手后重排。</li>
                <li><strong>触发条件</strong>：按住任意行开始拖拽并移动指针。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid，无"行 DOM"可平移，故用指示线
                  提示插入位置；antd 原生 <code>&lt;tr&gt;</code> 可用 transform 跟随指针。</li>
              </ul>
            </li>
            <li>
              <strong>列宽 / 行高</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 用 fixed 布局，Address 无 width 列填剩余空间
                  并换行、行随换行内容自动增高、无横滚条；antd 忠实复刻官方 auto 布局，同款数据会横滚。</li>
                <li><strong>触发条件</strong>：第 1 行 address 超长时。</li>
                <li><strong>差异原因</strong>：data-grid 无 width 列为
                  <code>minmax(0,1fr)</code> 填剩余空间（CSS Grid 行为），是本 demo 的目标态；
                  antd 保留官方原貌作对照基准。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
