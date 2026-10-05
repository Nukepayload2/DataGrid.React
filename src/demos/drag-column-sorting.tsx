import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import DragColumnSortingDg from './drag-column-sorting.dg'
import DragColumnSortingAntd from './drag-column-sorting.antd'

export default function DragColumnSortingDemo() {
  const [bordered, setBordered] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [columnReorder, setColumnReorder] = useState(true)
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
          
          <Switch
            checked={autoScroll}
            onChange={setAutoScroll}
            checkedChildren="AutoScroll"
            unCheckedChildren="AutoScroll"
          />
          
          <Switch
            checked={columnReorder}
            onChange={setColumnReorder}
            checkedChildren="ColumnReorder"
            unCheckedChildren="ColumnReorder"
          />
        </Space>
      </DemoToolbar>

      
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
          <strong>对照说明：</strong>前后两栏呈现 data-grid（自研 pointer 列方向拖拽）与 antd 官方
          drag-column-sorting（dnd-kit 列拖拽）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 拖拽中显示<strong>蓝色垂直指示线</strong>
                  + 被拖列 overlay 跟随指针 + 中间列自动让位；antd 被拖列表头
                  <strong>跟随指针平移</strong>（transform）+ body cell borderInline 虚线指示 +
                  DragOverlay 预览（灰底）。</li>
                <li><strong>触发条件</strong>：按住列头并水平移动指针。</li>
                <li><strong>差异原因</strong>：data-grid 的一列不是单一 DOM 元素（表头/表体单元格是
                  独立的 grid item），dnd-kit 的单元素 transform 模型无法平移整列，故 data-grid 只对
                  可见单元格做离散 transform，真实重排仍由 columns 更新完成。</li>
              </ul>
            </li>
            <li>
              <strong>列标志（仅 data-grid）</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的 Gender 列 <code>gridColumnOptions.dragColumnLock:'lockDrag'</code>
                  （不可发起拖但被动让位）、Email 列 <code>gridColumnOptions.dragColumnLock:'lockPosition'</code>
                  （不可发起拖且 index 固定）；antd
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

