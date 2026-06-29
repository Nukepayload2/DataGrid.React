/**
 * colspan-rowspan 双栏对照 demo：表头列合并（column.colSpan）+ 单元格行/列合并
 * （onCell 返回 {rowSpan, colSpan}，含 =0 不渲染）。共享 `Bordered` 开关同步驱动左栏
 * data-grid 与右栏 antd Table。
 *
 * 预期渲染结果（5 行 × 6 列，两侧同）：
 *   - 表头：5 个可见格（RowHead | Name | Home phone 跨 2 列 | Address）。Phone 表头被 Home phone 覆盖。
 *   - 第 1 行：正常 6 格。
 *   - 第 2 行（index===1）：Name 跨 5 列（覆盖 Age/Home phone/Phone/Address），共 2 格。
 *   - 第 3 行：正常 6 格。
 *   - 第 4 行（index===3）：Home phone 向下合并 2 行（覆盖第 5 行同列）。共 6 格。
 *   - 第 5 行（index===4）：Home phone 被覆盖（rowSpan:0），共 5 格。
 */

import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import ColspanRowspanDg from './colspan-rowspan.dg'
import ColspanRowspanAntd from './colspan-rowspan.antd'

export default function ColspanRowspanDemo() {
  // 共享状态：同一个 bordered 同时驱动两侧（初值 true 对齐 antd demo）。
  const [bordered, setBordered] = useState(true)
  const { virtual } = useVirtualization()
  // 控制条文字色 token 化（colorTextSecondary），暗主题自适应。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            同时驱动左右两栏
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表 6 列、无 scroll.x）→ 横排阈值 ≈ 480×2 + 16 = 976。
        常规笔记本视口（≥1024）横排；窄视口竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<ColspanRowspanDg bordered={bordered} virtual={virtual} />}
        right={<ColspanRowspanAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>本 demo 左右并排呈现 data-grid 与 antd colspan-rowspan。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>表头 / 单元格合并实现机制</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Home phone 列 <code>colSpan:2</code>（表头跨 2 列）+
                  Phone 列 <code>colSpan:0</code>（被覆盖）；第 2 行 Name <code>colSpan:5</code> 向右合并；
                  第 4 行 Home phone <code>rowSpan:2</code> 向下合并、第 5 行 <code>rowSpan:0</code> 被覆盖。
                  data-grid 用 <code>columnTree.applyHeaderColSpan</code>（表头）+
                  <code>cellMerge.computeCellMergePlan</code>（单元格）算 <code>hidden</code> + span；
                  antd 原生 <code>colspan/rowspan</code>。</li>
                <li><strong>触发条件</strong>：列定义含 <code>colSpan</code> 或单元格 <code>onCell</code>
                  返回 <code>rowSpan/colSpan</code>（始终）。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid，把被覆盖格标 <code>hidden</code> 不渲染
                  DOM、左上角格设 <code>grid-column/grid-row</code> span；antd 原生 <code>&lt;table&gt;</code>
                  直接用 <code>colspan/rowspan</code> 属性。两侧合并区最终一致。详见
                  <code>docs/design-notes/header.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>rowScope='row' 视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：RowHead 列两侧均渲染灰底 + 文字色 + 加粗（视觉套 antd
                  <code>tbody &gt; tr &gt; th</code> 规则）。</li>
                <li><strong>触发条件</strong>：<code>rowScope='row'</code>（始终）。</li>
                <li><strong>差异原因</strong>：antd 把该列渲染为 <code>&lt;th scope="row"&gt;</code> 自动套
                  <code>tbody&gt;tr&gt;th</code> 样式；data-grid 用 <code>.dg-cell-rowscope</code> 消费
                  <code>--dg-header-bg/--dg-header-color</code> + <code>font-weight:600</code> 还原。两侧视觉一致。</li>
              </ul>
            </li>
            <li>
              <strong>跨列表头居中</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Home phone 表头格 <code>colSpan:2</code> 文字居中。
                  antd 给 <code>&lt;th colspan&gt;</code> <code>textAlign:center</code>；data-grid
                  <code>.dg-cell-header[data-header-colspan]</code> 触发 <code>justify-content:center</code>。</li>
                <li><strong>触发条件</strong>：表头列含 <code>colSpan &gt;= 2</code>（始终）。</li>
                <li><strong>差异原因</strong>：data-grid 表头格是 grid item（flex 布局），
                  用 <code>justify-content</code> 而非 <code>text-align</code> 居中。效果等价。</li>
              </ul>
            </li>
            <li>
              <strong>合并格 hover（column-aware）</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：合并格（<code>rowSpan:2</code> 跨第 4-5 行）在其跨度内任一行
                  被 hover 时都高亮——hover 第 4 行或第 5 行，Home phone 合并格都染色。</li>
                <li><strong>触发条件</strong>：hover 合并格跨度内的任意行。</li>
                <li><strong>差异原因</strong>：antd rc-table <code>inHoverRange</code> 用区间相交判定
                  （<code>cellStartRow &lt;= hoverRow &lt;= cellStartRow+rowSpan-1</code>）；data-grid 合并格作为
                  单个 grid item 跨 2 行整块染色（<code>dg-row-hover</code> 驱动）。两侧语义一致。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
