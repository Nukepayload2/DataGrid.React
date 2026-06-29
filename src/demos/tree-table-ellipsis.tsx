/**
 * 复刻 antd `tree-table-ellipsis` demo：
 *   `G:\Projects\ant-design\components\table\demo\tree-table-ellipsis.tsx`
 *
 * 双栏对照：树形首列 ellipsis + fixed 组合（issue #36583）。
 *   - 左栏（data-grid Table）：树形 data（children 嵌套）+ Name 列 ellipsis + width:'30%' +
 *     fixed（Switch 受控）+ rowSelection 前置 + defaultExpandAllRows。
 *   - 右栏（antd Table）：antd 原生 `<Table>` + 同列结构 + 同 rowSelection + 同 expandable。
 *   - 共享控制条：`Fixed first column` 开关同时驱动两侧（默认 true，对齐 antd demo）。
 *
 * 父文件保留外壳职责：fixed state（顶部 Switch 读写）+ useVirtualization + DemoToolbar +
 * SplitDemo + 对照说明。两侧表格 JSX + columns 由子组件提供（props 驱动 fixed + virtual）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y；树形展开行视为普通行，同样被 RO 实测。
import { useVirtualization } from './VirtualizationContext'
import TreeTableEllipsisDg from './tree-table-ellipsis.dg'
import TreeTableEllipsisAntd from './tree-table-ellipsis.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function TreeTableEllipsisDemo() {
  // 共享状态：同一个 fixed state 同时驱动两侧表格；默认 true（对齐 antd demo）。
  const [fixed, setFixed] = useState(true)
  // 顶栏 Switch ON 时两侧 Table 叠加 virtual + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：全宽，在 SplitDemo 上方；同一个 fixed state 同时驱动两侧。 */}
      <DemoToolbar>
        <Space align="center">
          <span>Fixed first column:</span>
          <Switch checked={fixed} onChange={setFixed} />
        </Space>
      </DemoToolbar>

      {/* minPaneWidth=900：Name name 超长撑开 + 固定列 + 选择列 → 宽表；常规视口竖排（每栏全宽更友好）。 */}
      <SplitDemo
        minPaneWidth={900}
        left={<TreeTableEllipsisDg fixed={fixed} virtual={virtual} />}
        right={<TreeTableEllipsisAntd fixed={fixed} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（树形首列 ellipsis + fixed 组合，issue #36583）：</strong>
          左右并排呈现 data-grid 与 antd tree-table-ellipsis demo（树形 name 超长 +
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
              <strong>Fixed 开关（核心）</strong>：
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：切换 Name 列 fixed true/false，横向滚动时 Name 列固定与否。</li>
                <li><strong>触发条件</strong>：顶部 <code>Fixed first column</code> Switch。</li>
                <li><strong>差异原因</strong>：共享 state 同时驱动两侧，验证两侧 fixed 行为一致。</li>
              </ul>
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
