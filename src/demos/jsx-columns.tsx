import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import JsxDg from './jsx-columns.dg'
import JsxAntd from './jsx-columns.antd'

export default function JsxDemo() {
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
      <SplitDemo
        minPaneWidth={480}
        left={<JsxDg bordered={bordered} virtual={virtual} />}
        right={<JsxAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd jsx demo，
          两侧均用 JSX <code>&lt;Table.Column&gt;</code>/<code>&lt;Table.ColumnGroup&gt;</code> 子元素声明列。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>JSX 列声明</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧都把 <code>&lt;Table.Column&gt;</code>/
                  <code>&lt;Table.ColumnGroup&gt;</code> 子元素解析为列定义（含 ColumnGroup 多级表头）。</li>
                <li><strong>触发条件</strong>：未传 <code>columns</code> prop 而传 JSX children。</li>
                <li><strong>说明</strong>：JSX 子组件会按与 columns 等价的方式声明普通列和分组列。</li>
              </ul>
            </li>
            <li>
              <strong>Space size 取值</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid Action 列 <code>&lt;Space&gt;</code> 用
                  <code>size="middle"</code>；antd 用 <code>size="medium"</code>。</li>
                <li><strong>触发条件</strong>：始终（demo 写死）。</li>
                <li><strong>说明</strong>：<code>middle</code> 与 <code>medium</code> 在这里视觉等价。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
