
import { useState } from 'react'
import { Button, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data } from './_compare/expand-column-position.shared'
import { useVirtualization } from './VirtualizationContext'
import ExpandStickyDg from './expand-column-position.dg'
import ExpandStickyAntd from './expand-column-position.antd'

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

  const onExpandedRowsChange = (keys: readonly React.Key[]) => {
    setExpandedRowKeys([...keys])
  }

  return (
    <div className="demo-view">
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
          <strong>对照说明：</strong>前后两栏呈现 data-grid 与 antd expand-sticky demo
          （bordered + Team 列每 2 行合并 + EXPAND_COLUMN 哨兵控制展开列位置）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>展开过渡差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 展开/收起为 CSS Grid 的 <code>grid-template-rows</code>
                  track <code>0fr↔1fr</code> 过渡；antd 无展开动画（仅展开图标有旋转过渡）。</li>
                <li><strong>触发条件</strong>：点击任一行的展开图标。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid 渲染展开行（track 高度直接可动画插值），
                  antd 的展开行立即出现/消失。详见{' '}
                  <code>docs/features/interaction/expand.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>expandedRowOffset</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两侧均设 <code>expandedRowOffset: 3</code>（展开内容跳过
                  Team / 展开列 / Name，从 Age 列开始）并用 <code>EXPAND_COLUMN</code> 哨兵控制展开列位置；
                  两侧展开列位置一致（Team 之后、Name 之前）。该 prop 在 rc-table 1.10.2 未废弃，
                  仍作为展开行 colspan 偏移生效。</li>
                <li><strong>触发条件</strong>：始终（展开列位置由列顺序决定，展开行 colspan 偏移由
                  <code>expandedRowOffset</code> 决定）。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

