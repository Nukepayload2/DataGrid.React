import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import DragSortingHandlerDg from './drag-handle-row-sorting.dg'
import DragSortingHandlerAntd from './drag-handle-row-sorting.antd'

export default function DragSortingHandlerDemo() {
  const [bordered, setBordered] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
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
        </Space>
      </DemoToolbar>

      
      <SplitDemo
        minPaneWidth={480}
        left={<DragSortingHandlerDg bordered={bordered} autoScroll={autoScroll} virtual={virtual} />}
        right={<DragSortingHandlerAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid（自研手柄列拖拽）与 antd 官方
          drag-sorting-handler（dnd-kit 手柄列拖拽）。首列为手柄列，只有按住手柄拖拽才会启动排序。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 拖拽中显示<strong>被拖行的副本跟随鼠标</strong>
                  （原位的行隐藏，只保留占位）+ <strong>一条蓝色线</strong>标示插入位置；antd 被拖的行
                  <strong>跟随鼠标移动</strong>，松手后重排。</li>
                <li><strong>触发条件</strong>：按住手柄拖动。</li>
                <li><strong>差异原因</strong>：data-grid 的一行不是单一 DOM 元素（各单元格是相互独立的元素），
                  无法把整行作为一个整体移动，所以拖拽中用被拖行的副本 + 蓝色线标示位置，中间行让位；
                  antd 原生 <code>&lt;tr&gt;</code> 是单一元素，可以直接移动。</li>
              </ul>
            </li>
            <li>
              <strong>手柄触发机制</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 通过
                  <code>gridOptions.rowDragSort.handleSelector</code> 指定手柄（给手柄加 class 作为标识）；
                  antd 用 <code>RowContext.Provider</code> 把 <code>setActivatorNodeRef</code>/
                  <code>listeners</code> 传递给手柄组件。</li>
                <li><strong>触发条件</strong>：仅手柄列触发，点 Name/Age/Address 不触发。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS 选择器指定手柄，只有按住手柄才会触发拖拽；
                  antd 的官方 demo 把拖拽事件直接绑定到手柄组件上。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
