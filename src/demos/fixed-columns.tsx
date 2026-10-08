
import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import FixedColumnsDg from './fixed-columns.dg'
import FixedColumnsAntd from './fixed-columns.antd'

// Demo 根组件

type SizeOption = 'medium' | 'large'

export default function FixedColumnsDemo() {
  // 共享状态：同一个 bordered/size 同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const [size, setSize] = useState<SizeOption>('medium')
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
          <strong>对照说明：</strong>本 demo 两栏呈现 data-grid 与 antd fixed-columns。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>固定列效果</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Full Name + Age 固定 start（左）、Action 固定 end（右），
                  中间 Column 1-20 普通列。横向滚动时两侧列保持固定。两侧效果一致，视觉一致。</li>
                <li><strong>触发条件</strong>：列含 <code>fixed:'start'/'end'</code> + scroll.x（始终）。</li>
                <li><strong>差异原因</strong>：两侧都用 CSS sticky 实现固定列，视觉效果一致。详见
                  <code>docs/features/columns/fixed-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>固定列边缘阴影切换</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：滚到最左时 antd 隐藏 start 阴影、最右隐藏 end 阴影；
                  data-grid 两侧阴影恒显（阴影本身 8px 模糊 + 极淡 alpha，视觉差异极小）。</li>
                <li><strong>触发条件</strong>：横向滚到边缘。</li>
                <li><strong>差异原因</strong>：antd 根据横向滚动位置动态隐藏/显示阴影；data-grid 阴影恒显。
                  详见 <code>docs/features/columns/fixed-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>无 width 列 + scroll.x:'max-content'</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：中间 Column 1-20 无 <code>width</code>，两侧
                  <code>scroll.x:'max-content'</code> 下表格均保持 <code>table-layout:auto</code>。</li>
                <li><strong>触发条件</strong>：含无 <code>width</code> 普通列 + <code>scroll.x:'max-content'</code>。</li>
                <li><strong>差异原因</strong>：auto 布局下实际列总宽小于可滚动宽度时，右固定列可能脱离右边缘
                  （data-grid 已知问题）；本 demo 内容短，是否可见需人工验证。详见
                  <code>docs/features/columns/fixed-column.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

