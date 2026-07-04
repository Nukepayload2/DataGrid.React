import { useState } from 'react'
import { Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import TreeDataDg from './tree-data.dg'
import TreeDataAntd from './tree-data.antd'

export default function TreeDataDemo() {
  const [checkStrictly, setCheckStrictly] = useState(false)
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space>
          <Switch
            checked={checkStrictly}
            onChange={setCheckStrictly}
            checkedChildren="CheckStrictly"
            unCheckedChildren="CheckStrictly"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            {checkStrictly
              ? 'checkStrictly=true（父子独立，互不影响）'
              : 'checkStrictly=false（默认，父子勾选联动）'}
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={<TreeDataDg checkStrictly={checkStrictly} virtual={virtual} />}
        right={<TreeDataAntd checkStrictly={checkStrictly} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd tree-data demo
          （childrenColumnName='children' + 首列缩进 + 展开图标 + checkStrictly 父子联动）。
          顶部 <code>CheckStrictly</code> 开关共享驱动两侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>checkStrictly 引擎默认差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid <code>rowSelection.checkStrictly</code> 默认
                  <strong> true</strong>（父子独立）；antd 默认 <strong>false</strong>（父子联动）。</li>
                <li><strong>触发条件</strong>：未显式传 <code>checkStrictly</code> 时两侧默认值不同。</li>
                <li><strong>差异原因</strong>：data-grid 引擎层默认偏向父子独立（避免隐式联动），
                  antd 原生默认父子联动。本 demo 两侧均显式传共享 state（初值 false），规避差异。</li>
              </ul>
            </li>
            <li>
              <strong>pagination</strong>：data-grid 与 antd 默认均开启分页；左栏显式传
              <code>pagination=&#123;&#123;&#125;&#125;</code> 只是把 demo 意图写明，行为等价于不传。
            </li>
            <li>
              <strong>onSelect 回调差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd demo 含 <code>onSelect</code>（单行勾选回调）console.log；
                  data-grid <code>TableRowSelection</code> 仅声明 <code>onChange</code>。</li>
                <li><strong>触发条件</strong>：勾选任意一行时。</li>
                <li><strong>差异原因</strong>：data-grid 尚未声明 onSelect 类型；左栏用 <code>onChange</code>
                  观察勾选变化（功能等价，<code>onChange</code> 在每次勾选时触发）。</li>
              </ul>
            </li>
            <li>
              <strong>树形渲染</strong>：record 含 <code>children</code> 嵌套 → 自动进入树形模式；
              缩进 = <code>level × indentSize(15px)</code>，点 Name 列展开图标（▶/▼）toggle 子树。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
