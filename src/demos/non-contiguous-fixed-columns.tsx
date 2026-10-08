
import { useState } from 'react'
import { Segmented, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import FixedGappedColumnsDg from './non-contiguous-fixed-columns.dg'
import FixedGappedColumnsAntd from './non-contiguous-fixed-columns.antd'

// Demo 根组件

type SizeOption = 'medium' | 'large'

export default function FixedGappedColumnsDemo() {
  // 共享状态：同一个 bordered/size 同时驱动两侧表格。
  const [bordered, setBordered] = useState(true)
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
        本 demo 含 scroll.x:'max-content' 的宽表（25 列，含分散固定列堆叠），半宽（~960px at
        1920 视口）下每栏仅 ~480px 太挤、横滚严重 + 分散堆叠结构看不清；取大阈值使常规笔记本
        视口（1440–1920）下竖排（每栏全宽，对宽表更友好），仅超宽屏（≥2200）才横排。
      */}
      <SplitDemo
        minPaneWidth={900}
        left={
          // 左栏 data-grid：分散固定列堆叠（接共享 bordered/size）。
          <FixedGappedColumnsDg bordered={bordered} size={size} virtual={virtual} />
        }
        right={
          // antd 官方 fixed-gapped-columns demo 忠实复刻：
          // 分散固定列堆叠（start: FullName+Column1 不相邻 / end: Action1+Action3 不相邻）
          // + bordered + scroll x max-content + pagination false.
          <FixedGappedColumnsAntd bordered={bordered} size={size} virtual={virtual} />
        }
      >
        <div>
          <strong>对照说明：</strong>本 demo 两栏呈现 data-grid 与 antd fixed-gapped-columns。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>分散固定列堆叠</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：start 侧 FullName（最左）+ Column1（第 3 列，中间夹 Age）
                  不相邻；end 侧 Action1 + Action3（中间夹 Action2）不相邻。横向滚动时 4 个固定列都
                  sticky 固定（start 两个叠在左侧、end 两个叠在右侧）。两侧结构一致。</li>
                <li><strong>触发条件</strong>：固定列不相邻（始终）。</li>
                <li><strong>差异原因</strong>：无差异。两侧 <code>fixed:'start'/'end'</code> 语义一致，
                  固定列不要求相邻。详见
                  <code>docs/features/columns/fixed-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>固定列边缘阴影切换</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：滚到边缘时 antd 隐藏对应侧阴影；data-grid 分散固定列
                  （Column1 起 start 阴影 / Action1 起 end 阴影）恒显，两侧视觉差异极小。</li>
                <li><strong>触发条件</strong>：横向滚到边缘。</li>
                <li><strong>差异原因</strong>：两侧差别仅在滚到边缘时阴影是否隐藏，视觉差异极小。
                  详见 <code>docs/features/columns/fixed-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>无 width 列 + scroll.x:'max-content'</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：本 demo 用 <code>scroll.x:'max-content'</code>，左右固定列
                  严格贴住容器边缘（与 antd 一致）。</li>
                <li><strong>触发条件</strong>：含无 <code>width</code> 普通列 + <code>scroll.x:'max-content'</code>。</li>
                <li><strong>差异原因</strong>：<code>scroll.x:'max-content'</code> 时表格宽度由内容决定，
                  固定列始终贴住边缘；用数字 <code>scroll.x</code> 时若各列宽度总和小于声明宽度，
                  固定列可能不贴边（本 demo 不属于这种情况）。
                  详见 <code>docs/features/columns/fixed-column.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

