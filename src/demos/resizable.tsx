/**
 * 列宽拖拽调整 demo（data-grid 增强能力，antd 无原生 resizable demo，自建演示）。
 *
 * 双栏对照（特例：右栏无 antd 原生对应）：
 * - 左栏（data-grid Table）：`columnResizeMode` + `resizableMinWidth`/`resizableMaxWidth` 演示 pointer
 *   拖拽改列宽模式 + min/max 约束 + 部分列给 width / 部分不给（max-content → 首次拖拽转 px）。
 * - 右栏（antd 无原生 resizable）：antd 6.4.4 Table 无原生列宽拖拽（resizable）能力，右栏不渲染
 *   antd 同名 demo，而是一个说明区 + 一张静态 antd `<Table>` 作基线参照（同数据/同列，无拖拽手柄）。
 * - 共享状态 + 控制条：`columnResizeMode` / `minWidth` / `maxWidth` 三个控件只驱动左栏 data-grid
 *   （右栏无此能力，控制条不作用于右栏）。共享数据见 `_compare/resizable.shared.ts`。
 */

import { useState } from 'react'
import { InputNumber, Segmented, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import ResizableDg from './resizable.dg'
import ResizableAntd from './resizable.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ResizableDemo() {
  const [columnResizeMode, setColumnResizeMode] =
    useState<'Disabled' | 'ResizeLeft' | 'ResizeSibling'>('ResizeLeft')
  const [minWidth, setMinWidth] = useState(30)
  const [maxWidth, setMaxWidth] = useState(400)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      {/* 控制条：仅驱动左栏 data-grid（右栏 antd 无 resizable 能力）。 */}
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
          控制条仅作用于左栏 data-grid（右栏 antd 无 resizable 原生能力）
        </span>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，5 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
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
          <strong>对照说明：</strong>左右并排呈现 data-grid resizable 与 antd 基线。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>右栏无 antd 原生对应</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd 6.4.4 Table 无原生 <code>resizable</code> 能力，
                  右栏仅显示说明 + 静态基线 Table（无拖拽手柄）；左栏支持拖拽。</li>
                <li><strong>触发条件</strong>：鼠标移到左栏表头格右边缘（data-grid 手柄出现）即出现差异。</li>
                <li><strong>差异原因</strong>：antd 列宽策略是声明式（<code>column.width</code> / table
                  layout 自动），无交互式列宽拖拽；列宽拖拽为 data-grid 增强。为不偏离「右栏忠实 antd 原生」
                  原则，右栏不复刻社区方案（react-resizable 等），仅作静态基线参照。</li>
              </ul>
            </li>
            <li>
              <strong>min/max 约束</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 <code>resizableMinWidth</code>/<code>resizableMaxWidth</code>
                  约束拖拽范围（默认 min 30px，可调）；右栏无此能力。</li>
                <li><strong>触发条件</strong>：拖拽到 min/max 边界时。</li>
                <li><strong>差异原因</strong>：仅 data-grid 提供 min/max 约束选项，是拖拽能力的扩展参数。</li>
              </ul>
            </li>
            <li>
              <strong>无 width 列首次拖拽转 px</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 Address / Tags / Description 不给 width（max-content），
                  首次拖拽即转为受控 px；Name / Age 给固定 width。</li>
                <li><strong>触发条件</strong>：对无 width 列发起首次拖拽时。</li>
                <li><strong>差异原因</strong>：data-grid 无 width 列按内容宽度（max-content）布局，
                  拖拽需要 px 受控值，故首次拖拽从内容宽度转为 px。详见
                  <code>docs/design-notes/column-width.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>Tag 实现差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏用内联最小 Tag（data-grid 不依赖 antd Tag）；右栏用 antd
                  <code>&lt;Tag color="blue"&gt;</code>。</li>
                <li><strong>触发条件</strong>：Tags 列渲染即出现。</li>
                <li><strong>差异原因</strong>：data-grid 引擎刻意不依赖 antd Tag，用内联 span 视觉等价 antd
                  预设色 blue。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
