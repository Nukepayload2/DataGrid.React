
import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import FixedColumnsHeaderDg from './fixed-columns-and-header.dg'
import FixedColumnsHeaderAntd from './fixed-columns-and-header.antd'

// Demo 根组件

export default function FixedColumnsHeaderDemo() {
  // 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'max-content' 的宽表（23 列），半宽（~960px at 1920 视口）下
        每栏仅 ~480px 太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下 **竖排**
        （每栏全宽，对 max-content 宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={<FixedColumnsHeaderDg bordered={bordered} virtual={virtual} />}
        right={<FixedColumnsHeaderAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd fixed-columns-header。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>scroll.y 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 用 <code>scroll.y:true</code>（布尔，
                  父容器固定高度 330px）；antd 用数字
                  <code>scroll.y:55*5</code>（忠实官方 demo）。</li>
                <li><strong>触发条件</strong>：表格进入固定表头模式（表体纵向滚动、表头钉顶）即出现。</li>
                <li><strong>差异原因</strong>：data-grid 的 <code>scroll.y</code> 只支持布尔
                  （true = 表体占满父容器高度，需父容器有明确高度）；antd 的 <code>scroll.y</code> 接受数字
                  （表体最大高度）。两侧表体均可纵向滚动、表头钉顶，视觉一致。</li>
              </ul>
            </li>
            <li>
              <strong>滚动条样式差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 走自绘悬浮滚动条（macOS 风格细条），antd（非虚拟时）用
                  浏览器原生滚动条。</li>
                <li><strong>触发条件</strong>：表体或表头区域出现滚动条即出现（虚拟化开关 ON 时 antd
                  改用虚拟滚动的自绘滚动条）。</li>
                <li><strong>差异原因</strong>：data-grid 默认用自绘滚动条；antd Table 非虚拟时用浏览器原生滚动条。</li>
              </ul>
            </li>
            <li>
              <strong>右固定列在边界宽度下可能脱离容器右边缘</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 横向滚到最右时，右固定列 Action 可能脱离容器右边缘；
                  antd 无此问题。</li>
                <li><strong>触发条件</strong>：data-grid 含 <code>scroll.x:'max-content'</code> + Action fixed
                  <code>'end'</code> + 中间 Column 8-20 无 width（max-content）。</li>
                <li><strong>差异原因</strong>：两侧固定列 + <code>scroll.x:'max-content'</code> 均为
                  <code>table-layout:auto</code>；边界宽度下实际列总宽小于可滚动宽度时，右固定列可能偏移脱离右边缘。
                  详见 <code>docs/features/columns/fixed-column.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

