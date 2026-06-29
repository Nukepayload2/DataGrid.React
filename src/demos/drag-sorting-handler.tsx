/**
 * drag-sorting-handler 双栏对照 demo：仅手柄列触发的行拖拽排序。两侧各自维护 dataSource。
 * - 左栏 data-grid：自研 pointer 行拖拽（`useRowDragSort` + `handleSelector: '.dg-drag-handle'`）。
 * - 右栏 antd：忠实复刻官方 drag-sorting-handler（@dnd-kit + RowContext 透传 listeners 到手柄）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'
import DragSortingHandlerDg from './drag-sorting-handler.dg'
import DragSortingHandlerAntd from './drag-sorting-handler.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function DragSortingHandlerDemo() {
  // 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // autoScrollOnDrag 开关（仅驱动左栏 data-grid；antd 无对应概念）。
  const [autoScroll, setAutoScroll] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* 控制条：Bordered + AutoScroll 开关。DemoToolbar 用 useToken 适配主题。 */}
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
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<DragSortingHandlerDg bordered={bordered} autoScroll={autoScroll} virtual={virtual} />}
        right={<DragSortingHandlerAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid（自研 pointer 手柄列拖拽）与 antd 官方
          drag-sorting-handler（dnd-kit 手柄列拖拽）。首列为手柄列，仅按住手柄拖拽才启动排序。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 拖拽中显示<strong>蓝色指示线</strong>
                  （被拖行原位不动）；antd 被拖行<strong>跟随指针平移</strong>（transform），松手后重排。</li>
                <li><strong>触发条件</strong>：按住手柄并移动指针。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid 无"行 DOM"可平移，故用指示线；
                  antd 原生 <code>&lt;tr&gt;</code> 可 transform。</li>
              </ul>
            </li>
            <li>
              <strong>手柄触发机制</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 通过外层容器事件委托 +
                  <code>handleSelector: '.dg-drag-handle'</code> 命中（手柄加 class 作命中标识）；
                  antd 用 <code>RowContext.Provider</code> 把 <code>setActivatorNodeRef</code>/
                  <code>listeners</code> 透传到 DragHandle。</li>
                <li><strong>触发条件</strong>：仅手柄列触发，点 Name/Age/Address 不触发。</li>
                <li><strong>差异原因</strong>：data-grid 无 tr 上挂 listeners 的机制，靠容器事件委托 +
                  选择器限定手柄命中；antd 在 <code>&lt;tr&gt;</code> 组件层用 context 下发 listeners
                  到手柄 DOM。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
