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
    <div className="demo-view">
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
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd tree-data demo
          （childrenColumnName='children' + 首列缩进 + 展开图标 + checkStrictly 父子联动）。
          顶部 <code>CheckStrictly</code> 开关共享驱动两侧。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>checkStrictly 默认值</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧默认均为 <strong>true</strong>（父子独立），无差异。</li>
                <li><strong>触发条件</strong>：未显式传 <code>checkStrictly</code>。</li>
                <li><strong>说明</strong>：本 demo 两侧均显式传共享 <code>checkStrictly</code> state（初值 false = 父子联动），顶部开关同时驱动两侧。</li>
              </ul>
            </li>
            <li>
              <strong>pagination</strong>：data-grid 与 antd 默认均开启分页；前栏显式传
              <code>pagination=&#123;&#123;&#125;&#125;</code> 只是把 demo 意图写明，行为等价于不传。
            </li>
            <li>
              <strong>onSelect 回调</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd demo 变体额外接了 <code>onSelect</code>（单行勾选回调）console.log；
                  前栏变体仅接 <code>onChange</code>（data-grid <code>TableRowSelection</code> 类型同样声明了
                  <code>onSelect</code>，demo 未使用）。</li>
                <li><strong>触发条件</strong>：勾选任意一行时。</li>
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
