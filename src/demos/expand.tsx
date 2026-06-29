/**
 * 复刻 antd `expand` demo（M9 行展开）：
 *   `G:\Projects\ant-design\components\table\demo\expand.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`expandable.expandedRowRender`
 *   渲染 description + `rowExpandable` 禁用 "Not Expandable" 行 + grid 0fr↔1fr 过渡）。
 * - **右栏（antd Table）**：忠实复刻 antd expand demo（antd `<Table>` + antd expandable）。
 * - **共享状态 + 控制条**：`expandedRowKeys` 受控（同一份 state 同时驱动两侧）+
 *   顶部全宽按钮组「Expand All / Collapse All」一键展开/收起可展开行（同步驱动两侧）。
 *   antd demo 原本非受控展开，决策 9 下改为受控 + 按钮组，便于对照两侧展开行为同步。
 * - **共享数据**：`RecordType` + `data`（4 行，第 3 行 "Not Expandable"）见
 *   `_compare/expand.shared.ts`。
 *
 * === antd demo 要素 ===
 *
 * - `expandable.expandedRowRender(record)`：展开内容渲染 description。
 * - `expandable.rowExpandable(record)`：record.name === 'Not Expandable' 的行不可展开
 *   → 图标禁用（与 antd 一致）。
 *
 * === 两侧保留的差异 ===
 *
 * - 基本逐字复刻（columns / expandable 一致）。
 * - 展开过渡实现差异：左栏 data-grid grid track `0fr↔1fr`（lun 思路，纯 React 重写）；
 *   右栏 antd 内置展开动画。
 *
 * === 验证点（M9 + 决策 9）===
 *
 * 1. 每行第一列渲染展开图标；点击展开/收起。
 * 2. "Not Expandable" 行图标禁用（灰、cursor not-allowed、点击无反应）——两侧一致。
 * 3. 顶部「Expand All」按钮一键展开两侧所有可展开行（3 行，"Not Expandable" 不展开）。
 * 4. 「Collapse All」一键收起两侧所有行。
 * 5. 同一行展开/收起两侧同步（共享 expandedRowKeys 受控）。
 *
 * === 拆子文件（task #56：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：expandedRowKeys state（受控真理源，驱动两侧 + 顶部按钮组）+
 * useVirtualization + DemoToolbar(Expand All / Collapse All 按钮组) + SplitDemo 外壳 +
 * children 对照说明 + T7 验证面 CSS（.dg-demo-expanded-row）。
 * 两侧表格 JSX 与 columns 拆到子文件：
 *   - `./expand.dg`：`ExpandDg({expandedRowKeys, onExpandedRowsChange, virtual})`（左栏）
 *   - `./expand.antd`：`ExpandAntd({expandedRowKeys, onExpandedRowsChange, virtual})`（右栏）
 *
 * ★ 状态提升说明：expandedRowKeys 必须留父——父渲染顶部 Expand All / Collapse All 按钮
 *   组需直接读写它；且同一 state 驱动两侧同步。子组件接 expandedRowKeys + onExpandedRowsChange
 *   回调（配置型 state 提升，默认值 []，纯瞬时态合理）。
 */

import { useState } from 'react'
import { Button, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { data } from './_compare/expand.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（决策2——展开内容直接渲染但不参与虚拟窗口大小）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + expandable 派生由子组件提供（props 驱动）。RecordType/data
//   现在由子文件各自 import expand.shared；父文件只保留 data（用于 Expand All 派生可展开行 key）。
import ExpandDg from './expand.dg'
import ExpandAntd from './expand.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ExpandDemo() {
  // ★ 共享状态：同一份 expandedRowKeys 同时驱动两侧表格（受控）。
  // 可展开行 = 除 "Not Expandable" 外的 3 行（rowExpandable 过滤）。
  const [expandedRowKeys, setExpandedRowKeys] = useState<Array<React.Key>>([])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y
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

  // onExpandedRowsChange 回调（两侧同款）：
  // - 左栏 data-grid `onExpandedRowsChange(keys: Key[])`。
  // - 右栏 antd `onExpandedRowsChange(expandedKeys: Key[])`。
  // 两者均为 Key 数组，规整成 React.Key[] 后回写共享 state（驱动两侧同步）。
  const onExpandedRowsChange = (keys: Array<React.Key>) => {
    setExpandedRowKeys([...keys])
  }

  return (
    <div style={{ padding: 24 }}>
      {/* ★ T7 验证面：展开行的视觉标记 class（dg-demo-expanded-row）。
          verifier 检查：展开某行后，该行所有单元格底色变浅黄；收起后恢复。
          class 由 expandable.expandedRowClassName 返回，仅展开行追加。 */}
      <style>{`.dg-demo-expanded-row { background: var(--ant-color-warning-bg) !important; }`}</style>
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
          <strong>对照说明（决策 9 B10 / M9 行展开）：</strong>
          左右并排呈现 data-grid 与 antd expand demo（expandable.expandedRowRender +
          rowExpandable 禁用 "Not Expandable" 行）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>共享展开状态</strong>：顶部「Expand All / Collapse All」一键展开/收起
              可展开行，<strong>同一份 expandedRowKeys 同时驱动两侧</strong>（受控，切换一次、左右同步 diff）。
            </li>
            <li>
              <strong>rowExpandable</strong>：第 3 行 "Not Expandable" 图标禁用
              （灰、cursor not-allowed、点击无反应），Expand All 也不会展开它——两侧一致。
            </li>
            <li>
              <strong>展开过渡差异</strong>：左栏 data-grid grid track <code>0fr↔1fr</code>
              过渡（lun 思路，纯 React 重写）；右栏 antd 内置展开动画。
            </li>
            <li>
              <strong>与 antd demo 差异</strong>：antd demo 原本非受控展开；决策 9 下改为受控 +
              按钮组，便于对照两侧展开行为同步。
            </li>
            <li>
              <strong>T7 expandRowByClick + expandedRowClassName（仅左栏 data-grid）</strong>：
              左栏开启 <code>expandRowByClick: true</code>——点击<strong>行体</strong>（任意非图标单元格）
              切换该行展开/收起，且<strong>不阻止</strong> <code>onRow.onClick</code>（共存，对齐 antd）；
              同时 <code>expandedRowClassName</code> 给展开行追加 <code>dg-demo-expanded-row</code> class
              （浅黄底，verifier 检查 DOM/视觉）。右栏 antd 不开（对照）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
