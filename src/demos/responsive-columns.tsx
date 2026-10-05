import { useState } from 'react'
import { Grid, Space, Switch, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { useVirtualization } from './VirtualizationContext'
import ResponsiveDg from './responsive-columns.dg'
import ResponsiveAntd from './responsive-columns.antd'

export default function ResponsiveDemo() {
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  // 仅用于展示当前断点；列显隐仍由两侧表格各自订阅。
  const screens = Grid.useBreakpoint()
  const { token } = theme.useToken()

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
            Current breakpoints: md={screens.md ? '✓' : '✗'} lg={screens.lg ? '✓' : '✗'}
            （调整视口宽度对照列显隐）
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={<ResponsiveDg bordered={bordered} virtual={virtual} />}
        right={<ResponsiveAntd bordered={bordered} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd responsive demo。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>断点检测机制差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：无（两侧列显隐切换完全同步——Age <code>responsive:['md']</code>
                  与 Address <code>responsive:['lg']</code> 在同一视口宽度下同时显隐）。</li>
                <li><strong>触发条件</strong>：调整浏览器视口宽度——≥lg（≥992px）三列全显；
                  md（768–991px）Name+Age；&lt;md（&lt;768px）仅 Name。</li>
                <li><strong>差异原因</strong>：两侧都用 antd <code>Grid.useBreakpoint</code> /
                  responsiveObserver 检测断点（data-grid 引擎内部订阅 + antd Table 内部订阅），
                  断点语义一致故同步。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
