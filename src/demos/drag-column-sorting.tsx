/**
 * drag-column-sorting 双栏对照 demo：列方向拖拽排序。两侧各自维护 columns。
 * - 左栏 data-grid：自研 pointer 列拖拽（`useColumnDragSort` 命中叶子表头格 + 垂直指示线 + arrayMoveColumns）。
 * - 右栏 antd：忠实复刻官方 drag-column-sorting（@dnd-kit + restrictToHorizontalAxis + useSortable +
 *   DragIndexContext borderInline 虚线 + DragOverlay 预览）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（列拖拽命中表头，在虚拟窗口内）。
import { useVirtualization } from './VirtualizationContext'
import DragColumnSortingDg from './drag-column-sorting.dg'
import DragColumnSortingAntd from './drag-column-sorting.antd'

// ===========================================================================
// Demo 根组件
// ===========================================================================

export default function DragColumnSortingDemo() {
  // 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // autoScrollOnDrag 开关（仅驱动左栏 data-grid；antd 无对应概念）。
  const [autoScroll, setAutoScroll] = useState(true)
  // columnReorder 全局开关（仅驱动左栏 data-grid）：关 → 所有列头不可拖（总闸，优先于单列 movable/lockPosition）。
  const [columnReorder, setColumnReorder] = useState(true)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：Bordered + AutoScroll + ColumnReorder 开关。DemoToolbar 用 useToken 适配主题。 */}
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
          {/* columnReorder 全局开关（仅驱动左栏 data-grid）。 */}
          <Switch
            checked={columnReorder}
            onChange={setColumnReorder}
            checkedChildren="ColumnReorder"
            unCheckedChildren="ColumnReorder"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（5 列无 scroll.x，列窄但总宽不大）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <DragColumnSortingDg
            bordered={bordered}
            autoScroll={autoScroll}
            columnReorder={columnReorder}
            virtual={virtual}
          />
        }
        right={<DragColumnSortingAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid（自研 pointer 列方向拖拽）与 antd 官方
          drag-column-sorting（dnd-kit 列拖拽）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 拖拽中显示<strong>蓝色垂直指示线</strong>
                  （被拖列原位不动，指示线提示列插入位置）；antd 被拖列表头
                  <strong>跟随指针平移</strong>（transform）+ body cell borderInline 虚线指示 +
                  DragOverlay 预览（灰底）。</li>
                <li><strong>触发条件</strong>：按住列头并水平移动指针。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid，transform 平移单个单元格会破坏
                  grid 布局，故用指示线提示插入位置；antd 各列 <code>&lt;th&gt;</code>/<code>&lt;td&gt;</code>
                  可独立 transform。</li>
              </ul>
            </li>
            <li>
              <strong>列标志（仅 data-grid）</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的 Gender 列 <code>movable:false</code>
                  （不可发起拖但被动让位）、Email 列 <code>lockPosition:true</code>（位置固定）；antd
                  忠实复刻官方，无此单列约束。</li>
                <li><strong>触发条件</strong>：尝试拖动 Gender/Email 列，或拖动其它列让其让位。</li>
                <li><strong>差异原因</strong>：data-grid 列方向拖拽支持 per-column 标志
                  （<code>gridColumnOptions</code>），是相对官方的功能扩展。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
