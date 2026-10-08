import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import DragSortingDg from './drag-row-sorting.dg'
import DragSortingAntd from './drag-row-sorting.antd'

export default function DragSortingDemo() {
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
        left={<DragSortingDg bordered={bordered} autoScroll={autoScroll} virtual={virtual} />}
        right={<DragSortingAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid（自研行拖拽）与 antd 官方
          drag-sorting（dnd-kit 行拖拽）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>拖拽视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 拖拽中显示<strong>被拖行的副本跟随鼠标</strong>
                  （原位的行隐藏，只保留占位）+ <strong>一条蓝色线</strong>标示插入位置，松手后重排；
                  antd 被拖的行<strong>跟随鼠标移动</strong>，松手后重排。</li>
                <li><strong>触发条件</strong>：按住任意行拖动。</li>
                <li><strong>差异原因</strong>：data-grid 的一行不是单一 DOM 元素（各单元格是相互独立的元素），
                  无法把整行作为一个整体移动，所以拖拽中用被拖行的副本 + 蓝色线标示位置，中间行让位；
                  antd 原生 <code>&lt;tr&gt;</code> 是单一元素，可以直接移动。</li>
              </ul>
            </li>
            <li>
              <strong>列宽 / 行高</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 用 fixed 布局，Address 无 width 列填剩余空间
                  并换行、行随换行内容自动增高、无横滚条；antd 忠实复刻官方 auto 布局，同款数据会横滚。</li>
                <li><strong>触发条件</strong>：第 1 行 address 超长时。</li>
                <li><strong>差异原因</strong>：data-grid 无 width 的列会自动填满剩余空间，
                  这是本 demo 的目标态；antd 保留官方原貌作对照基准。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

