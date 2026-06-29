/**
 * 复刻 antd `order-column` demo（M9 + M5 + S10）：
 *   `G:\Projects\ant-design\components\table\demo\order-column.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（columns 用 `Table.EXPAND_COLUMN` +
 *   `Table.SELECTION_COLUMN` 哨兵控制展开/选择列位置：Name → 展开 → Age → 选择 → Address；
 *   rowSelection + expandable.expandedRowRender）。
 * - **右栏（antd Table）**：忠实复刻 antd order-column demo（antd `<Table>` + antd
 *   `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵 + antd rowSelection + expandable）。
 * - **共享数据**：`RecordType` + `data`（4 行，第 3 行 "Not Expandable" 仅文字）见
 *   `_compare/order-column.shared.ts`。
 * - **无独立控制条**：本 demo antd 原始结构无控制条（哨兵位置由 columns 数组静态决定），
 *   无需共享控件；两栏直接静态呈现。
 *
 * === 两侧保留的差异 ===
 *
 * - 基本逐字复刻（columns 顺序 / rowSelection / expandable 一致）。
 * - 哨兵类型差异：左栏 `Table.EXPAND_COLUMN/SELECTION_COLUMN` 来自 data-grid 引擎
 *   （`types.ts` 同款哨兵对象），右栏 antd `Table.EXPAND_COLUMN/SELECTION_COLUMN` 来自
 *   antd 本体。两侧 columns 数组结构等价。
 * - 左栏额外页面下方展示 selectedKeys（便于无 console 环境验证）；antd demo 无。
 * - 左栏 rowSelection 用受控 selectedRowKeys（便于页面下方显示），右栏 antd 用 `rowSelection={{}}`
 *   非受控（与 antd demo 逐字一致）。此差异不影响哨兵位置验证（核心目标）。
 *
 * === 拆子文件（task：live 编辑接入，同 expand 模式）===
 *
 * 父文件只保留「外壳职责」：selectedKeys state（左栏受控真理源，驱动父底部 selectedKeys 可视化区）+
 * useVirtualization + SplitDemo 外壳 + children 对照说明 + 左栏选中态可视化区。
 * 两侧表格 JSX 与 columns 拆到子文件：
 *   - `./order-column.dg`：`OrderColumnDg({selectedKeys, onSelectedKeysChange, virtual})`（左栏）
 *   - `./order-column.antd`：`OrderColumnAntd({virtual})`（右栏，rowSelection 非受控自管）
 *
 * ★ 状态提升说明：左栏 dg 的 selectedKeys 必须留父——父底部「左栏 data-grid selectedKeys」
 *   可视化区需直接读取它（便于无 console 环境验证选择功能）。右栏 antd rowSelection={{}}
 *   非受控（与 antd demo 逐字一致），选择 state 在子组件内自管，父无需也不读取它。
 */

import { useState } from 'react'
import { theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// 虚拟化开关（决策 7）：顶栏 Switch 全局驱动两侧 Table 的 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + expandable/rowSelection 派生由子组件提供（props 驱动）。
//   RecordType/data 现在由子文件各自 import order-column.shared；父文件不再需要。
import OrderColumnDg from './order-column.dg'
import OrderColumnAntd from './order-column.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function OrderColumnDemo() {
  // 左栏 rowSelection 受控（便于页面下方显示 selectedKeys，对照验证选择功能）。
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  // 虚拟化开关（决策 7）：顶栏 Switch ON 时两侧 Table 接入 virtual + scroll.y。
  const { virtual } = useVirtualization()
  // 主题 token：选中态可视化区文字色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)、
  // colorTextTertiary≈rgba(0,0,0,0.45)），暗主题自适应。
  const { token } = theme.useToken()

  // 左栏 dg 选择变化写回父 state（驱动父底部 selectedKeys 可视化区刷新）。
  const onSelectedKeysChange = (keys: Array<React.Key>) => {
    setSelectedKeys(keys)
  }

  return (
    <div style={{ padding: 24 }}>
      {/*
        minPaneWidth=480（5 列含展开/选择哨兵，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <OrderColumnDg
            selectedKeys={selectedKeys}
            onSelectedKeysChange={onSelectedKeysChange}
            virtual={virtual}
          />
        }
        right={<OrderColumnAntd virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 B9 / S10 列顺序）：</strong>
          左右并排呈现 data-grid 与 antd order-column demo（EXPAND_COLUMN + SELECTION_COLUMN
          哨兵控制展开/选择列位置）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>列顺序</strong>：Name → <strong>展开列（EXPAND_COLUMN）</strong> → Age →
              <strong> 选择列（SELECTION_COLUMN）</strong> → Address。两侧一致。
            </li>
            <li>
              <strong>哨兵来源差异</strong>：左栏 <code>Table.EXPAND_COLUMN/SELECTION_COLUMN</code>
              来自 data-grid 引擎；右栏 antd 同名哨兵来自 antd 本体。结构等价。
            </li>
            <li>
              <strong>M9 × M5 组合</strong>：勾选 / 展开独立工作，互不干扰；4 行均可展开
              （antd demo 未设 rowExpandable，"Not Expandable" 仅文字）。
            </li>
            <li>
              <strong>rowSelection 受控差异</strong>：左栏受控（便于页面下方显示 selectedKeys）；
              右栏 antd <code>{'{'}{'}'}</code> 非受控（与 antd demo 逐字一致）。不影响哨兵位置验证。
            </li>
          </ul>
        </div>
      </SplitDemo>

      {/* 左栏选中态可视化（便于无 console 环境验证选择功能）。 */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: token.colorFillQuaternary,
          borderRadius: 8,
          color: token.colorTextSecondary,
          fontSize: 12,
        }}
      >
        <strong>左栏 data-grid selectedKeys:</strong>{' '}
        {selectedKeys.length === 0 ? (
          <span style={{ color: token.colorTextTertiary }}>(none)</span>
        ) : (
          <code>[{selectedKeys.map((k) => `"${k}"`).join(', ')}]</code>
        )}
        <div style={{ marginTop: 4 }}>
          列顺序：Name → <strong>展开列（EXPAND_COLUMN）</strong> → Age →
          <strong> 选择列（SELECTION_COLUMN）</strong> → Address。
        </div>
      </div>
    </div>
  )
}
