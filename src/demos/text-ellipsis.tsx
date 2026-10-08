
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd ellipsis demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>ellipsis: true 行为</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧 Address ×4 列内容溢出时均显示省略号（<code>...</code>），
                  hover 时通过 native title 显示完整文本。</li>
                <li><strong>触发条件</strong>：<code>column.ellipsis: true</code> 列内容超出列宽时。</li>
                <li><strong>差异原因</strong>：两侧省略号显示效果一致（省略号 + native title），差异只在底层表格布局方式，不影响外观。</li>
              </ul>
            </li>
            <li>
              <strong>边界宽度下省略号生效程度可能不同</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：在边界宽度（容器很窄）下，两侧省略号生效程度可能略有差异。</li>
                <li><strong>触发条件</strong>：容器宽度不足以容纳所有列时。</li>
                <li><strong>差异原因</strong>：两侧列宽分配策略不同，容器很窄时各列收缩程度和省略号出现位置可能略有差异。详见
                  <code>docs/features/columns/column-width.md</code>。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

