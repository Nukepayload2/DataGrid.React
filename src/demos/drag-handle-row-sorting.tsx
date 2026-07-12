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
    <div style={{ padding: 24 }}>
      
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

