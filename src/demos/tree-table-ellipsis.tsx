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
          前后两栏呈现 data-grid 与 antd tree-table-ellipsis demo（树形 name 超长 +
          Name ellipsis+fixed(Switch) + defaultExpandAllRows + rowSelection）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>四机制正交组合</strong>：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li>
                  <strong>差异行为</strong>：Name 列同时承担 fixed sticky 定位 +
                  ellipsis CSS 类 + 树形内容前缀（缩进 + 展开图标）+ 前置 rowSelection 哨兵列，
                  四者作用于不同层面（定位 / CSS 类 / 内容 / 列顺序）。
                </li>
                <li><strong>触发条件</strong>：Name = 第一个含 dataIndex 的叶子列，且 fixed=true。</li>
                <li><strong>差异原因</strong>：data-grid 引擎 BodyCell 渲染时这四层面正交，组合正确工作不冲突。</li>
              </ul>
            </li>
            <li>
              <strong>Fixed 开关</strong>：顶部 <code>Fixed first column</code> Switch 以共享 state
              同时驱动前后两栏 Name 列的 <code>fixed</code>，用于对照两侧 fixed 表现是否一致。
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
                <li><strong>差异原因</strong>：data-grid <code>derivedTableLayout</code> 隐式派生 <code>tableLayout:'fixed'</code>（首列 ellipsis）+ 无 width 列 <code>minmax(0,1fr)</code>（min:0 收缩），与 antd <code>&lt;table&gt;</code> + tableLayout:fixed 一致。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
