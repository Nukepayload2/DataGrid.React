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
          <strong>对照说明：</strong>两栏呈现 data-grid（自研列拖拽）与 antd 官方
          drag-column-sorting（dnd-kit 列拖拽）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 拖拽中显示<strong>一条蓝色竖线</strong>
                  标示目标位置，被拖列的副本跟随鼠标，中间列自动让位；antd 被拖的列表头
                  原位变灰（半透明），一个灰底的列表头预览跟随鼠标，目标列的 body 单元格
                  显示灰色虚线边框。</li>
                <li><strong>触发条件</strong>：按住列头水平拖动。</li>
                <li><strong>差异原因</strong>：data-grid 的一列不是单一 DOM 元素（表头和表体单元格是
                  相互独立的元素），无法把整列作为一个整体移动，所以拖拽中只移动可见单元格并显示
                  蓝色竖线，列的实际重排由 columns 更新完成。</li>
              </ul>
            </li>
            <li>
              <strong>列标志（仅 data-grid）</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的 Gender 列设置 <code>gridColumnOptions.dragColumnLock:'lockDrag'</code>
                  （不能拖动，其它列拖过时会跟着让位）、Email 列设置 <code>gridColumnOptions.dragColumnLock:'lockPosition'</code>
                  （不能拖动，位置固定）；antd
                  忠实复刻官方，没有这种单列约束。</li>
                <li><strong>触发条件</strong>：尝试拖动 Gender/Email 列，或拖动其它列让其让位。</li>
                <li><strong>差异原因</strong>：data-grid 的列拖拽支持按列设置锁定
                  （<code>gridColumnOptions.dragColumnLock</code>），是 antd 官方 demo 没有的扩展功能。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

