
import { useState } from 'react'
import { Button, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data } from './_compare/expand.shared'
// ON 时叠加 virtual + scroll.y（展开内容直接渲染但不参与虚拟窗口大小）
import { useVirtualization } from './VirtualizationContext'
import ExpandDg from './expand.dg'
import ExpandAntd from './expand.antd'

// Demo 根组件

export default function ExpandDemo() {
  // 共享状态：同一份 expandedRowKeys 同时驱动两侧表格（受控）。
  // 可展开行 = 除 "Not Expandable" 外的 3 行（rowExpandable 过滤）。
  const [expandedRowKeys, setExpandedRowKeys] = useState<Array<React.Key>>([])
  // ON 时两栏叠加 virtual=true + scroll.y
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  // 一键展开所有可展开行（"Not Expandable" 被排除）。
  const expandAll = () => {
    setExpandedRowKeys(
      data.filter((r) => r.name !== 'Not Expandable').map((r) => r.key),
    )
  }
  // 一键收起所有行。
  const collapseAll = () => setExpandedRowKeys([])

  // onExpandedRowsChange 回调（两侧同款）：规整成 React.Key[] 后回写共享 state（驱动两侧同步）。
  const onExpandedRowsChange = (keys: readonly React.Key[]) => {
    setExpandedRowKeys([...keys])
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 展开行视觉标记 class（仅左栏 data-grid 用，展开行底色变浅黄便于核对）。 */}
      <style>{`.dg-demo-expanded-row { background: var(--ant-color-warning-bg) !important; }`}</style>
      {/* 共享控制条：全宽，在 SplitDemo 上方。 */}
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

      {/*
        minPaneWidth=480（窄表，4 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <ExpandDg
            expandedRowKeys={expandedRowKeys}
            onExpandedRowsChange={onExpandedRowsChange}
            virtual={virtual}
          />
        }
        right={
          <ExpandAntd
            expandedRowKeys={expandedRowKeys}
            onExpandedRowsChange={onExpandedRowsChange}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>
          左右并排呈现 data-grid 与 antd 行展开（expandable.expandedRowRender + rowExpandable 禁用 "Not Expandable" 行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>展开过渡实现</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 用 CSS Grid track <code>0fr↔1fr</code> 过渡；右栏 antd 内置展开动画。</li>
                <li><strong>触发条件</strong>：展开/收起任意行。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid 渲染，展开内容行 track 从 0fr 动画到 1fr；antd 原生 <code>&lt;table&gt;</code> 用 rc-motion。详见 <code>docs/design-notes/expand.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>expandRowByClick + expandedRowClassName</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 开启 <code>expandRowByClick: true</code>（点击行体切换展开，且不阻止 <code>onRow.onClick</code>）+ <code>expandedRowClassName</code> 给展开行追加 <code>dg-demo-expanded-row</code> class（浅黄底）；右栏 antd 不开。</li>
                <li><strong>触发条件</strong>：点击行体非图标单元格（左栏），或展开任意行（左栏加 class）。</li>
                <li><strong>差异原因</strong>：data-grid 侧额外演示「点击行体展开」与「展开行视觉标记」两项能力，antd demo 仅图标展开。</li>
              </ul>
            </li>
            <li>
              <strong>展开控制方式</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：本 demo 两栏均受控（共享 expandedRowKeys + Expand All / Collapse All 按钮组）；antd 官方 demo 原本非受控展开。</li>
                <li><strong>触发条件</strong>：点击图标、行体或顶部按钮组。</li>
                <li><strong>差异原因</strong>：本 demo 为对照两侧展开行为同步，改为受控 + 按钮组（同一 state 驱动两侧）。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

