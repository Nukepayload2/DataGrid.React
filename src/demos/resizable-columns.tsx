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
    <div style={{ padding: 24 }}>
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

      <SplitDemo
        minPaneWidth={480}
        leftTitle={
          <>
            data-grid
            <span className="dg-compare__badge">AG Grid 收费级 · 免费</span>
          </>
        }
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
            <strong>① antd 病灶（六年未实现 · 官方已下掉）</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>
                antd 6.x Table <strong>无原生可伸缩列</strong>。rc-table 用
                <code>&lt;colgroup&gt;&lt;col width&gt;</code> 控制列宽，存在「假宽度」问题——
                用户设 <code>columns=[&#123;width:100&#125;, &#123;width:100&#125;]</code> 在 800px
                容器中实际渲染为 <code>[400px, 400px]</code>（按比例放大），第三方拖拽库取到的 width
                非真实像素，保存 localStorage 后还原失真。
              </li>
              <li>
                <a href="https://github.com/ant-design/ant-design/discussions/48152" target="_blank" rel="noreferrer">
                  #48152 [RFC] Table 支持可伸缩列
                </a>{' '}
                2024-03 提出至 2026-07 仍未落地；维护者 crazyair 在 RFC 内直言
                「<em>这个可是收费功能（某些库）</em>」，暗示 AG Grid 等商业表格把 resizable 当高级卖点。
              </li>
              <li>
                <a href="https://github.com/ant-design/ant-design/issues/56356" target="_blank" rel="noreferrer">
                  #56356 表格可伸缩列不跟手、位置偏移、无法退出拖拽
                </a>{' '}
                记录官网 demo 的三连故障：性能卡顿、鼠标与手柄失同步、松开后卡在拖拽态。
                维护者 afc163 确认「<em>这个库（react-resizable）已经多年不维护了</em>」并
                <strong>下掉了官网可伸缩列 demo</strong>（标签 <code>help wanted</code> /
                <code>Inactive</code>）。
              </li>
            </ul>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>② data-grid 解药（CSS Grid 真实 px · 内置免费）</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>
                引擎级内置 <code>useColumnResize</code> hook（
                <code>src/table/engine/useColumnResize.ts</code>），pointerdown 锁 pointer capture +
                读表头格 <code>getBoundingClientRect</code> 真实宽 + pointermove 按 mode 写入
                <code>resizedWidths: Map&lt;key, px&gt;</code>，pointerup 释放并清理监听
                ——<strong>完整生命周期 cleanup</strong>，治 #56356 的「松开后卡在拖拽」。
              </li>
              <li>
                列宽真理源是 <code>grid-template-columns</code> 单条字符串：拖拽只改这一条 CSS，
                <strong>结构性消除 antd <code>&lt;colgroup&gt;</code> 假宽度问题</strong>（RFC #48152
                描述的核心痛点）。详见{' '}
                <code>docs/features/columns/column-width.md</code>。
              </li>
              <li>
                <strong>min/max 约束</strong>：默认 min 30 / max Infinity，可数字（统一）或函数
                （按列 key 逐列定制）；move 中 <code>clamp(startWidth + delta, min, max)</code>。
              </li>
              <li>
                <strong>三模式</strong>：<code>Disabled</code>（无手柄，等同 antd 静态基线）/
                <code>ResizeLeft</code>（总宽跟手势变化）/<code>ResizeSibling</code>
                （相邻列反向增减，表格总宽不变，正是 RFC #48152 设计原则 3 的「未超容器宽时缩放互补」）。
              </li>
              <li>
                <strong>组合全正确</strong>：多级表头（仅叶子格渲染手柄，父分组格自动跟随）/
                固定列（RO 实测新宽 → 重算 sticky 偏移）/ 虚拟（行 track 与列 track 正交）/
                合并格（grid-column 范围不变，区间内宽变视觉跟随）详见{' '}
                <code>docs/features/columns/column-width.md</code>「与各能力组合」节。
              </li>
            </ul>
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>③ 如何观察</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
              <li>
                鼠标悬停<strong>左栏</strong>表头格右缘 → 出现 <code>dg-resizer</code> 拖拽手柄；
                按下拖动即改变列宽。右栏 antd Table 任意列边缘<strong>均无手柄</strong>。
              </li>
              <li>
                调顶部控制条 <code>min width</code> / <code>max width</code> → 拖到边界被 clamp，
                手势继续移动但列宽不动（对照 AG Grid 手感）。
              </li>
              <li>
                切 <code>ResizeLeft</code> → 表格总宽随手势变化（可能触发横向滚动）；
                切 <code>ResizeSibling</code> → 总宽不变，相邻列反向收缩/拉伸。
              </li>
              <li>
                切 <code>Disabled</code> → 左栏手柄消失，视觉等同右栏 antd 静态基线，直接对照落差。
              </li>
              <li>
                Name / Age 给了固定 <code>width</code>；Address / Tags / Description 未给 width
                （<code>max-content</code>），首次拖拽时引擎从渲染宽转为受控 px（见{' '}
                <code>docs/features/columns/column-width.md</code>「首次拖拽 max-content 列」节）。
              </li>
              <li>
                <strong>组合观察（固定列 × 拖拽）</strong>：Name 列已设{' '}
                <code>fixed: 'start'</code>，表格设 <code>scroll.x: 'max-content'</code>{' '}
                横向可滚。横向滚动表体 → Name 钉在左缘不动；同时拖 Address / Tags / Description
                任意列边界改变宽度 → <code>useStickyColumns</code> 的 ResizeObserver 自动重算
                固定列偏移，<strong>固定列与拖拽并存，无需额外处理</strong>（见{' '}
                <code>docs/features/columns/column-width.md</code>「与各能力组合 → 固定列」节）。
              </li>
            </ul>
          </div>
        </div>
      </SplitDemo>
    </div>
  )
}
