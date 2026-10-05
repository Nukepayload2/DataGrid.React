
import { useState } from 'react'
import { Button, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data } from './_compare/expandable-rows.shared'
// ON 时叠加 virtual + scroll.y（展开内容直接渲染但不参与虚拟窗口大小）
import { useVirtualization } from './VirtualizationContext'
import ExpandDg from './expandable-rows.dg'
import ExpandAntd from './expandable-rows.antd'

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
    <div className="demo-view">
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
          前后两栏呈现 data-grid 与 antd 行展开（expandable.expandedRowRender + rowExpandable 禁用 "Not Expandable" 行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>展开过渡</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 有 <code>grid-template-rows</code> track
                  <code>0fr↔1fr</code> 过渡；antd 无展开动画（仅展开图标有旋转过渡）。展开内容和受控状态两侧保持一致。</li>
                <li><strong>触发条件</strong>：展开/收起任意行。</li>
                <li><strong>说明</strong>：本页重点验证展开内容、展开图标和受控状态。</li>
              </ul>
            </li>
            <li>
              <strong>expandRowByClick + expandedRowClassName</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：前栏 data-grid 开启 <code>expandRowByClick: true</code>（点击行体切换展开，且不阻止 <code>onRow.onClick</code>）+ <code>expandedRowClassName</code> 给展开行追加 <code>dg-demo-expanded-row</code> class（浅黄底）；后栏 antd 不开。</li>
                <li><strong>触发条件</strong>：点击行体非图标单元格（前栏），或展开任意行（前栏加 class）。</li>
                <li><strong>说明</strong>：前栏额外演示「点击行体展开」与「展开行视觉标记」两项能力。</li>
              </ul>
            </li>
            <li>
              <strong>展开控制方式（demo 接线）</strong>：本 demo 两栏均受控（共享 expandedRowKeys +
              Expand All / Collapse All 按钮组），便于同步对照两侧行为；官方 antd demo 原本非受控展开。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
