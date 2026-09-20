
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
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd fixed-columns-header。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>scroll.y 取值差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用 <code>scroll.y:true</code>（布尔，
                  父容器 height:330 ≈ antd 表体 275 + 表头 ~55）；右栏 antd 用数字
                  <code>scroll.y:55*5</code>（忠实官方）。</li>
                <li><strong>触发条件</strong>：表格进入固定表头模式（表体纵向滚动、表头钉顶）即出现。</li>
                <li><strong>差异原因</strong>：data-grid 用纯 CSS flex 自适应高度（<code>y:true</code> 仅
                  支持布尔，需父容器明确高度）；antd 接受数字 max-height 语义。两侧表体均可纵向滚动、
                  表头钉顶，视觉等价。</li>
              </ul>
            </li>
            <li>
              <strong>滚动条样式差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏走悬浮滚动条（macOS 风格细条），右栏用浏览器默认滚动条。</li>
                <li><strong>触发条件</strong>：表体或表头区域出现滚动条即出现。</li>
                <li><strong>差异原因</strong>：antd 官方 demo 用 antd-style 自定义细滚动条，data-grid 项目
                  未装该依赖，故右栏退回浏览器默认。</li>
              </ul>
            </li>
            <li>
              <strong>右固定列在边界宽度下可能脱离容器右边缘</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏横向滚到最右时，右固定列 Action 可能脱离容器右边缘；
                  右栏 antd 无此问题。</li>
                <li><strong>触发条件</strong>：左栏含 <code>scroll.x:'max-content'</code> + Action fixed
                  <code>'end'</code> + 中间 Column 8-20 无 width（max-content）。</li>
                <li><strong>差异原因</strong>：无 width 列在 data-grid 下按 max-content 取内容宽度，
                  与 antd 的 width + flex fill 列宽策略不同，边界宽度下计算结果偏移。详见
                  <code>docs/design-notes/fixed-column.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

