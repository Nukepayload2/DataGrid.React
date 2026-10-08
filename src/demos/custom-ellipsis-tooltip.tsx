
import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import EllipsisCustomTooltipDg from './custom-ellipsis-tooltip.dg'
import EllipsisCustomTooltipAntd from './custom-ellipsis-tooltip.antd'

export default function EllipsisCustomTooltipDemo() {
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      {/* 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=600（同 ellipsis demo：Address×4 长文本列，略宽于 480）→ 横排阈值 ≈ 1216。
        常规笔记本视口（≥1280）横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={
          <EllipsisCustomTooltipDg bordered={bordered} virtual={virtual} />
        }
        right={
          <EllipsisCustomTooltipAntd bordered={bordered} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd ellipsis-custom-tooltip demo，
          Address ×4 列均 <code>ellipsis: {'{ showTitle: false }'}</code>，render 内用 antd Tooltip 接管 hover。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>native title 与 Tooltip 切换</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧 <code>showTitle:false</code> 列的单元格均不加 native
                  <code>title</code> 属性，由 render 内 <code>&lt;Tooltip placement="topLeft"&gt;</code>
                  接管 hover。</li>
                <li><strong>触发条件</strong>：列设 <code>ellipsis: {'{ showTitle: false }'}</code>。</li>
                <li><strong>差异原因</strong>：data-grid 与 antd 行为相同：仅当 <code>showTitle !== false</code>
                  时才加 native title，两侧语义一致。</li>
              </ul>
            </li>
            <li>
              <strong>省略号视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧内容溢出均显示 <code>...</code>。</li>
                <li><strong>触发条件</strong>：任一 ellipsis 列存在。</li>
                <li><strong>差异原因</strong>：无差异。有 ellipsis 列时，data-grid 与 antd 都会自动按固定列布局处理
                  （等效 <code>tableLayout:'fixed'</code>），两侧列宽与省略号行为一致。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

