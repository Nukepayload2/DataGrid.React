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
            同时驱动两栏
          </span>
        </Space>
      </DemoToolbar>

      
      <SplitDemo
        minPaneWidth={480}
        left={<ColspanRowspanDg bordered={bordered} virtual={virtual} />}
        right={<ColspanRowspanAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>本 demo 两栏呈现 data-grid 与 antd colspan-rowspan。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>表头 / 单元格合并</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Home phone 列 <code>colSpan:2</code>（表头跨 2 列）+
                  Phone 列 <code>colSpan:0</code>（被覆盖）；第 2 行 Name <code>colSpan:5</code> 向右合并；
                  第 4 行 Home phone <code>rowSpan:2</code> 向下合并、第 5 行 <code>rowSpan:0</code> 被覆盖。
                  两侧都用 <code>colSpan/rowSpan</code> 实现（表头在列定义、单元格在 <code>onCell</code>），
                  合并结果一致。</li>
                <li><strong>触发条件</strong>：列定义含 <code>colSpan</code> 或单元格 <code>onCell</code>
                  返回 <code>rowSpan/colSpan</code>（始终）。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid 渲染合并区域；antd 原生
                  <code>&lt;table&gt;</code> 直接用 <code>colspan/rowspan</code> 属性。两侧合并区最终一致。
                  详见 <code>docs/features/layout/header-and-span.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>rowScope='row' 视觉</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：RowHead 列两侧均渲染灰底 + 文字色 + 加粗，视觉一致。</li>
                <li><strong>触发条件</strong>：<code>rowScope='row'</code>（始终）。</li>
                <li><strong>差异原因</strong>：antd 把该列渲染为 <code>&lt;th scope="row"&gt;</code> 自动获得行头样式；
                  data-grid 还原同样的灰底加粗视觉。两侧视觉一致。</li>
              </ul>
            </li>
            <li>
              <strong>跨列表头居中</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：Home phone 表头格 <code>colSpan:2</code> 文字居中。
                  antd 默认把 colspan 大于 1 的表头格文字居中；data-grid 行为一致。</li>
                <li><strong>触发条件</strong>：表头列含 <code>colSpan &gt;= 2</code>（始终）。</li>
                <li><strong>差异原因</strong>：两侧居中效果一致。</li>
              </ul>
            </li>
            <li>
              <strong>合并格 hover</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：合并格（<code>rowSpan:2</code> 跨第 4-5 行）在其跨度内任一行
                  被 hover 时都高亮——hover 第 4 行或第 5 行，Home phone 合并格都染色。</li>
                <li><strong>触发条件</strong>：hover 合并格跨度内的任意行。</li>
                <li><strong>差异原因</strong>：两侧行为一致——hover 的行只要落在合并格覆盖的行范围内，
                  整个合并格都会高亮。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
