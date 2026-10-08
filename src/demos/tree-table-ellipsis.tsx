import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import TreeTableEllipsisDg from './tree-table-ellipsis.dg'
import TreeTableEllipsisAntd from './tree-table-ellipsis.antd'

export default function TreeTableEllipsisDemo() {
  const [fixed, setFixed] = useState(true)
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space align="center">
          <span>Fixed first column:</span>
          <Switch checked={fixed} onChange={setFixed} />
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={900}
        left={<TreeTableEllipsisDg fixed={fixed} virtual={virtual} />}
        right={<TreeTableEllipsisAntd fixed={fixed} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（树形首列 ellipsis + fixed 组合，issue #36583）：</strong>
          两栏呈现 data-grid 与 antd tree-table-ellipsis demo（树形 name 超长 +
          Name ellipsis+fixed(Switch) + defaultExpandAllRows + rowSelection）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>四个特性组合</strong>：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li>
                  <strong>差异行为</strong>：Name 列同时具备固定定位、省略号、
                  树形内容（缩进 + 展开图标），且前面还有一列行选择框，
                  四个特性互不干扰、组合下正常工作。
                </li>
                <li><strong>触发条件</strong>：fixed=true（Name 是表里第一个数据列）。</li>
                <li><strong>差异原因</strong>：两侧这四个特性相互独立，组合下正确工作、不冲突。</li>
              </ul>
            </li>
            <li>
              <strong>Fixed 开关</strong>：顶部 <code>Fixed first column</code> Switch 以共享 state
              同时驱动两栏 Name 列的 <code>fixed</code>，用于对照两侧 fixed 表现是否一致。
            </li>
            <li>
              <strong>checkStrictly 默认一致</strong>：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：父子独立勾选（默认 true）。</li>
                <li><strong>触发条件</strong>：两侧 rowSelection 均未显式传 checkStrictly，仅传 <code>columnWidth:100</code>。</li>
                <li><strong>差异原因</strong>：antd 6.4.4 默认 true，两侧都走默认 → 行为一致，无需显式同传对齐。</li>
              </ul>
            </li>
            <li>
              <strong>ellipsis 视觉对齐</strong>：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Name 列超长树名稳定省略号 <code>...</code>，两侧视觉一致。</li>
                <li><strong>触发条件</strong>：首列 <code>ellipsis:true + width:'30%'</code>。</li>
                <li><strong>差异原因</strong>：首列带 ellipsis 时两侧都使用固定表格布局（tableLayout:fixed），省略号显示一致。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
