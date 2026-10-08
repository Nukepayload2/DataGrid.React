import { useState } from 'react'
import { InputNumber, Segmented, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import ResizableDg from './resizable-columns.dg'
import ResizableAntd from './resizable-columns.antd'

export default function ResizableDemo() {
  const [columnResizeMode, setColumnResizeMode] =
    useState<'Disabled' | 'ResizeLeft' | 'ResizeSibling'>('ResizeLeft')
  const [minWidth, setMinWidth] = useState(30)
  const [maxWidth, setMaxWidth] = useState(400)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div className="demo-view">
      <DemoToolbar
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 24px',
          alignItems: 'center',
        }}
      >
        <Space>
          <span>resize mode:</span>
          <Segmented
            value={columnResizeMode}
            onChange={(value) =>
              setColumnResizeMode(value as 'Disabled' | 'ResizeLeft' | 'ResizeSibling')
            }
            options={['Disabled', 'ResizeLeft', 'ResizeSibling']}
          />
        </Space>
        <Space>
          <span>min width:</span>
          <InputNumber
            value={minWidth}
            min={1}
            max={200}
            onChange={(v) => setMinWidth(Number(v) || 1)}
            style={{ width: 80 }}
            addonAfter="px"
          />
        </Space>
        <Space>
          <span>max width:</span>
          <InputNumber
            value={maxWidth}
            min={50}
            max={2000}
            onChange={(v) => setMaxWidth(Number(v) || 50)}
            style={{ width: 80 }}
            addonAfter="px"
          />
        </Space>
        <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
          控制条只影响 data-grid，antd 保持静态对照
        </span>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={
          <ResizableDg
            columnResizeMode={columnResizeMode}
            minWidth={minWidth}
            maxWidth={maxWidth}
            virtual={virtual}
          />
        }
        right={<ResizableAntd virtual={virtual} />}
      >
        <div>
          <div>
            <strong>① antd 表现（静态对照）</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>
                antd 不提供列宽拖拽，只保留静态表格作为对照。
              </li>
              <li>观察重点在 data-grid 拖动后的列宽变化和边界限制。</li>
            </ul>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>② data-grid 表现（可直接拖拽）</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>
                打开列宽拖拽后，data-grid 表头右缘会出现手柄；拖动即可改变列宽。
              </li>
              <li>
                <strong>min/max 约束</strong>：可以统一设置最小 / 最大宽度，拖到边界后列宽保持在允许范围内。
              </li>
              <li>
                <strong>三种模式</strong>：<code>Disabled</code>（禁用手柄）/
                <code>ResizeLeft</code>（表格总宽跟着拖动变化）/<code>ResizeSibling</code>
                （相邻列反向增减，表格总宽不变）。
              </li>
              <li>
                可与固定列、虚拟滚动、多级表头和合并单元格一起使用；本页可直接观察固定列与拖拽的组合效果。
              </li>
            </ul>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>③ 如何观察</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>
                鼠标悬停<strong>data-grid</strong>表头格右缘会出现拖拽手柄；按下拖动即可改变列宽。antd 任意列边缘<strong>均无手柄</strong>。
              </li>
              <li>
                调顶部控制条 <code>min width</code> / <code>max width</code> → 拖到边界后，
                继续拖列宽也不再变化，观察边界约束下的拖拽手感。
              </li>
              <li>
                切 <code>ResizeLeft</code> → 表格总宽跟着拖动变化（拖宽后可能触发横向滚动）；
                切 <code>ResizeSibling</code> → 总宽不变，相邻列反向收缩/拉伸。
              </li>
              <li>
                切 <code>Disabled</code> → data-grid 手柄消失，视觉等同 antd 静态基线，直接对照落差。
              </li>
              <li>
                所有列都未给 <code>width</code>；固定布局下初始列宽均分容器，
                首次拖拽后列宽以拖动结果为准。
              </li>
              <li>
                <strong>组合观察（固定列 × 拖拽）</strong>：Name 列已设{' '}
                <code>fixed: 'start'</code>。在 <code>ResizeLeft</code> 下拖宽列直到出现横向滚动后，
                横向滚动表体 → Name 钉在左缘不动；同时拖 Address / Tags / Description
                任意列边界改变宽度，固定列仍保持在左侧。
              </li>
            </ul>
          </div>
        </div>
      </SplitDemo>
    </div>
  )
}
