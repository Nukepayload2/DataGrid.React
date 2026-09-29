import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import ColspanRowspanDg from './merged-cells.dg'
import ColspanRowspanAntd from './merged-cells.antd'

export default function ColspanRowspanDemo() {
  const [bordered, setBordered] = useState(true)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div className="demo-view">
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
                  <code>docs/features/layout/header-and-span.md</code>。</li>
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
                  <code>--ant-table-header-bg/--ant-table-header-color</code> + <code>font-weight:600</code> 还原。两侧视觉一致。</li>
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
