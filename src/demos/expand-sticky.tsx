/**
 * 参考 antd `expand-sticky` demo：
 *   `G:\Projects\ant-design\components\table\demo\expand-sticky.tsx`
 *
 * 双栏对照：bordered + Team 列每 2 行合并 + EXPAND_COLUMN 哨兵控制展开列位置。
 * `expandedRowKeys` 受控（同一份 state 同时驱动两侧）+ 顶部「Expand All / Collapse All」
 * 按钮组一键展开/收起。共享数据见 `_compare/expand-sticky.shared.ts`。
 */

import { useState } from 'react'
import { Button, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data } from './_compare/expand-sticky.shared'
import { useVirtualization } from './VirtualizationContext'
import ExpandStickyDg from './expand-sticky.dg'
import ExpandStickyAntd from './expand-sticky.antd'

// Demo 根组件

export default function ExpandStickyDemo() {
  // 同一份 expandedRowKeys 同时驱动两侧表格（受控），父控制条直接读写。
  const [expandedRowKeys, setExpandedRowKeys] = useState<Array<React.Key>>([])
  // 容器内 demo（EXPAND_COLUMN 哨兵控展开列位置，非页面级 position:sticky），
  // 无依赖页面滚动的 sticky 祖先，正常接入虚拟化。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  const expandAll = () => setExpandedRowKeys(data.map((r) => r.key))
  const collapseAll = () => setExpandedRowKeys([])

  const onExpandedRowsChange = (keys: Array<React.Key>) => {
    setExpandedRowKeys([...keys])
  }

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space>
          <Button onClick={expandAll}>Expand All</Button>
          <Button onClick={collapseAll}>Collapse All</Button>
          <span style={{ color: token.colorTextTertiary, fontSize: 12 }}>
            expandedRowKeys: [
            {expandedRowKeys.map((k) => `"${k}"`).join(', ')}]（同时驱动两侧）
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={
          <ExpandStickyDg
            expandedRowKeys={expandedRowKeys}
            onExpandedRowsChange={onExpandedRowsChange}
            virtual={virtual}
          />
        }
        right={
          <ExpandStickyAntd
            expandedRowKeys={expandedRowKeys}
            onExpandedRowsChange={onExpandedRowsChange}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd expand-sticky demo
          （bordered + Team 列每 2 行合并 + EXPAND_COLUMN 哨兵控制展开列位置）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>展开过渡差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 展开/收起为 CSS Grid 的 <code>grid-template-rows</code>
                  track <code>0fr↔1fr</code> 过渡；antd 内置 JS 驱动的展开动画。</li>
                <li><strong>触发条件</strong>：点击任一行的展开图标。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid 渲染展开行（track 高度直接可动画插值），
                  antd 用 JS 测量+动画。视觉时机略有差异。详见{' '}
                  <code>docs/design-notes/expand.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>expandedRowOffset 差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：右栏 antd demo 原样保留{' '}
                  <code>expandedRowOffset: 3</code>（已废弃 prop）；左栏 data-grid 不设此 prop，
                  纯靠 <code>EXPAND_COLUMN</code> 哨兵控位置。两侧展开列位置一致
                  （Team 之后、Name 之前），无额外视觉差异。</li>
                <li><strong>触发条件</strong>：始终（展开列位置由列顺序决定）。</li>
                <li><strong>差异原因</strong>：antd v5.26+ 该 prop 内部已转为 <code>EXPAND_COLUMN</code>
                  等效行为；data-grid 本就用哨兵列顺序控位置，无需复刻废弃 prop。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
