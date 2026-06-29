/**
 * fixed-columns 双栏对照 demo：左右固定列（Full Name + Age 固定 start，Action 固定 end）+
 * `scroll={{ x: 'max-content' }}` 横向滚动 + Age sorter。共享 `Bordered`（初值 false）+ `Size`
 * 控制条同步驱动左栏 data-grid 与右栏 antd Table。
 */

import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import FixedColumnsDg from './fixed-columns.dg'
import FixedColumnsAntd from './fixed-columns.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SizeOption = 'medium' | 'large'

export default function FixedColumnsDemo() {
  // 共享状态：同一个 bordered/size 同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const [size, setSize] = useState<SizeOption>('medium')
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SizeOption)}
            options={[
              { label: 'medium', value: 'medium' },
              { label: 'large', value: 'large' },
            ]}
          />
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=900 → 横排阈值 ≈ 900×2 + 16 = 1816px。纯 CSS flex-wrap 自适应（无 JS）。
        本 demo 含 scroll.x:'max-content' 的宽表（23 列），半宽（~960px at 1920 视口）下
        每栏仅 ~480px 太挤、横滚严重；取大阈值使常规笔记本视口（1440–1920）下竖排
        （每栏全宽，对 max-content 宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          // 左栏 data-grid：固定列 + scroll.x max-content（接共享 bordered/size）。
          <FixedColumnsDg bordered={bordered} size={size} virtual={virtual} />
        }
        right={
          // antd 官方 fixed-columns demo 忠实复刻：
          // Full Name/Age fixed start + Age sorter true + Action fixed end +
          // scroll x max-content + pagination false.
          <FixedColumnsAntd bordered={bordered} size={size} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明：</strong>本 demo 左右并排呈现 data-grid 与 antd fixed-columns。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>固定列实现机制</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Full Name + Age 固定 start（左）、Action 固定 end（右），
                  中间 Column 1-20 普通列。横向滚动时 sticky 固定两侧列。两侧结构一致，视觉一致。</li>
                <li><strong>触发条件</strong>：列含 <code>fixed:'start'/'end'</code> + scroll.x（始终）。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid <code>position:sticky</code> + 列宽
                  策略保证偏移稳定；antd 原生 <code>&lt;table&gt;</code> sticky。语义等价。详见
                  <code>docs/design-notes/fixed-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>固定列边缘阴影切换</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：滚到最左时 antd 隐藏 start 阴影、最右隐藏 end 阴影；
                  data-grid 两侧阴影恒显（阴影本身 8px 模糊 + 极淡 alpha，视觉差异极小）。</li>
                <li><strong>触发条件</strong>：横向滚到边缘。</li>
                <li><strong>差异原因</strong>：antd 由 rc-table 监听 scrollLeft 动态切换；data-grid 纯 CSS
                  不脚本监听。详见 <code>docs/design-notes/fixed-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>无 width 列 + scroll.x:'max-content'</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：中间 Column 1-20 无 <code>width</code>，data-grid 横滚到最右
                  时右固定列 Action 严格贴右（与 antd 一致）。</li>
                <li><strong>触发条件</strong>：含无 <code>width</code> 普通列 + <code>scroll.x:'max-content'</code>。</li>
                <li><strong>差异原因</strong>：data-grid 列宽策略下 max-content 路径使固定列偏移稳定贴边；
                  数字 <code>scroll.x</code> + 无 width 列总和 &lt; 声明宽时可能脱离（本 demo 不命中）。
                  详见 <code>docs/design-notes/fixed-column.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
