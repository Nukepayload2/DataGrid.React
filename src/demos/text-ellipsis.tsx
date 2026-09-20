
import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import EllipsisDg from './text-ellipsis.dg'
import EllipsisAntd from './text-ellipsis.antd'

export default function EllipsisDemo() {
  // 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

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
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=600（ellipsis 列有长文本 Address×4，略宽于 basic 的 480）→ 横排阈值 ≈ 1216。
        常规笔记本视口（≥1280）横排；窄视口自动换行竖排（每栏全宽，长文本更友好）。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={<EllipsisDg bordered={bordered} virtual={virtual} />}
        right={<EllipsisAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd ellipsis demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>ellipsis: true 实现机制差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧 Address ×4 列均省略号（<code>...</code>）+ hover 显示
                  native title；但实现不同——左栏 data-grid 用 <code>dg-cell-ellipsis</code> CSS 类
                  （<code>overflow:hidden + white-space:nowrap + text-overflow:ellipsis +
                  word-break:keep-all</code>），右栏 antd 用原生 ellipsis（<code>genEllipsisStyle</code>）。</li>
                <li><strong>触发条件</strong>：<code>column.ellipsis: true</code> 列内容超出列宽时。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid 布局，自行实现等价 ellipsis CSS 类对齐
                  antd 的省略号样式；antd 用原生 <code>&lt;table&gt;</code> tableLayout:fixed。</li>
              </ul>
            </li>
            <li>
              <strong>边界宽度下省略号生效程度可能不同</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：在边界宽度（容器很窄）下，两侧省略号生效程度可能略有差异。</li>
                <li><strong>触发条件</strong>：容器宽度不足以容纳所有列时。</li>
                <li><strong>差异原因</strong>：两侧列宽策略不同——data-grid 用 minmax(0,1fr) 收缩
                  （min:0 允许列收缩触发省略），antd 用 width + flex fill。详见
                  <code>docs/design-notes/column-width.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

