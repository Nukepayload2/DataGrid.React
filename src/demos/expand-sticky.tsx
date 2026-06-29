/**
 * 参考 antd `expand-sticky` demo（M9 展开列位置 + 合并×展开）：
 *   `G:\Projects\ant-design\components\table\demo\expand-sticky.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（bordered + Team 列每 2 行合并
 *   onCell rowSpan:2/0 + `Table.EXPAND_COLUMN` 哨兵控位置 + expandable.expandedRowRender）。
 * - **右栏（antd Table）**：忠实复刻 antd expand-sticky demo（antd `<Table>` bordered +
 *   antd `Table.EXPAND_COLUMN` 哨兵 + antd expandable，含 antd demo 原样的
 *   `expandedRowOffset: 3`——该 prop v5.26+ 已废弃但 antd 本体仍接受，内部转为 EXPAND_COLUMN
 *   等效行为）。
 * - **共享状态 + 控制条**：`expandedRowKeys` 受控（同一份 state 同时驱动两侧）+
 *   顶部全宽按钮组「Expand All / Collapse All」一键展开/收起（同步驱动两侧）。
 * - **共享数据**：`RecordType` + `data`（4 行，Team A/B 各 2 行）见
 *   `_compare/expand-sticky.shared.ts`。
 *
 * === 简化说明 ===
 *
 * antd 的 `expandedRowOffset` 已废弃（v5.26+）：设置后会强制把前 N 列设为固定列 + 展开列偏移。
 * 官方建议改用 `Table.EXPAND_COLUMN` 通过列顺序控制位置。**左栏 data-grid 本就用 EXPAND_COLUMN
 * 哨兵控位置**（不复刻废弃 offset）；**右栏 antd 忠实复刻 antd demo 原样保留 `expandedRowOffset: 3`**
 * （antd 本体仍接受该 prop，内部转为 EXPAND_COLUMN 等效行为）。两侧展开列位置应一致
 * （Team 之后、Name 之前）。
 *
 * === 拆子文件（task：live 编辑接入，同 expand 模式）===
 *
 * 父文件只保留「外壳职责」：expandedRowKeys state（受控真理源，驱动两侧 + 顶部按钮组）+
 * useVirtualization + DemoToolbar(Expand All / Collapse All 按钮组) + SplitDemo 外壳 +
 * children 对照说明。
 * 两侧表格 JSX 与 columns 拆到子文件：
 *   - `./expand-sticky.dg`：`ExpandStickyDg({expandedRowKeys, onExpandedRowsChange, virtual})`（左栏）
 *   - `./expand-sticky.antd`：`ExpandStickyAntd({expandedRowKeys, onExpandedRowsChange, virtual})`（右栏）
 *
 * ★ 状态提升说明：expandedRowKeys 必须留父——父渲染顶部 Expand All / Collapse All 按钮
 *   组需直接读写它；且同一 state 驱动两侧同步。子组件接 expandedRowKeys + onExpandedRowsChange
 *   回调（配置型 state 提升，默认值 []，纯瞬时态合理）。
 */

import { useState } from 'react'
import { Button, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data } from './_compare/expand-sticky.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（容器内 demo，可虚拟）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + expandable 派生由子组件提供（props 驱动）。RecordType/data
//   现在由子文件各自 import expand-sticky.shared；父文件只保留 data（用于 Expand All 派生所有行 key）。
import ExpandStickyDg from './expand-sticky.dg'
import ExpandStickyAntd from './expand-sticky.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ExpandStickyDemo() {
  // ★ 共享状态：同一份 expandedRowKeys 同时驱动两侧表格（受控）。
  const [expandedRowKeys, setExpandedRowKeys] = useState<Array<React.Key>>([])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
  // ★ 本 demo 是容器内 demo（EXPAND_COLUMN 哨兵控展开列位置，非页面级 position:sticky），
  //   无 overflow:visible 依赖页面滚动的 sticky 祖先，故正常接入虚拟化。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  // 一键展开所有行（本 demo 无 rowExpandable，4 行均可展开）。
  const expandAll = () => setExpandedRowKeys(data.map((r) => r.key))
  // 一键收起所有行。
  const collapseAll = () => setExpandedRowKeys([])

  // onExpandedRowsChange 回调（两侧同款）：规整成 React.Key[] 后回写共享 state（驱动两侧同步）。
  const onExpandedRowsChange = (keys: Array<React.Key>) => {
    setExpandedRowKeys([...keys])
  }

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一状态同时驱动两侧表格。 */}
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
        minPaneWidth=480（窄表偏宽，6 列含展开哨兵 + bordered，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
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
          <strong>对照说明（决策 9 B10 / M9 展开列位置 + 合并×展开）：</strong>
          左右并排呈现 data-grid 与 antd expand-sticky demo（bordered + Team 列每 2 行合并
          + EXPAND_COLUMN 哨兵控制展开列位置）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>展开列位置</strong>：Team → <strong>展开列（EXPAND_COLUMN）</strong>
              → Name → Age → Address → Action。两侧一致。
            </li>
            <li>
              <strong>合并 × 展开</strong>：Team 列每 2 行合并（M3 onCell rowSpan:2/0）与
              M9 展开组合；展开内容跨整行（grid-column: 1 / -1），不受合并列影响。
            </li>
            <li>
              <strong>共享展开状态</strong>：顶部「Expand All / Collapse All」一键展开/收起，
              <strong>同一份 expandedRowKeys 同时驱动两侧</strong>（受控，切换一次、左右同步 diff）。
            </li>
            <li>
              <strong>expandedRowOffset 差异</strong>：左栏 data-grid 纯靠 EXPAND_COLUMN 哨兵控位置
              （不复刻废弃 offset）；右栏 antd 忠实复刻 antd demo 原样保留{' '}
              <code>expandedRowOffset: 3</code>（v5.26+ 已废弃，antd 本体内部等效哨兵，不产生额外视觉差异）。
            </li>
            <li>
              <strong>展开过渡差异</strong>：左栏 data-grid grid track <code>0fr↔1fr</code>；
              右栏 antd 内置展开动画。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
