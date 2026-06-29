/**
 * 复刻 antd row-selection-and-operation demo：
 * `G:\Projects\ant-design\components\table\demo\row-selection-and-operation.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（rowSelection.selectedRowKeys 受控 +
 *   批量操作 Reload）。**双栏改造点（决策 6）**：Reload 按钮由改造前的原生 `<button>` 自绘
 *   （PrimaryButton）改为 antd `<Button type="primary" loading>`——与右栏 antd 对齐，
 *   §9（S8 Reload 原生 button）登记关闭。
 * - **右栏（antd Table）**：忠实复刻 antd row-selection-and-operation demo（antd `<Flex>` 布局 +
 *   antd `<Button type="primary" loading>` + antd 原生 rowSelection）。
 * - **共享控制条 / 顶部操作区**：本 demo antd 原始结构即"顶部操作区"（Reload + Selected N items），
 *   无独立控制条；改造后**两侧共用同一个顶部操作区**（全宽，在 SplitDemo 上方），同一个
 *   `selectedRowKeys` state + 同一个 `loading` state 同时驱动两侧。
 * - **共享状态**：`selectedRowKeys`（受控真理源）+ `loading`（Reload 1s 模拟 ajax），**同一组
 *   state 同时驱动两侧表格 + 顶部操作区**；两侧 onChange 都写回同一 selectedRowKeys。
 *   **批量清空同步**：点 Reload → loading 1s → `setSelectedRowKeys([])` → 两侧勾选 UI 同步清空。
 * - **共享数据**：`RecordType` + `dataSource` 见 `_compare/row-selection-and-operation.shared.ts`。
 *
 * === ★ 行选择 state 处理（SOP 提升）===
 *
 * 顶部 Reload 按钮「清空选择」直接操作 selectedRowKeys → 选择 state **提升到父**（而非子组件自管）：
 *   - `selectedRowKeys` + `loading` 在父组件 useState；
 *   - 两侧子组件均受控（selectedRowKeys = 父 props，onChange → onSelectedKeysChange 写回父）；
 *   - Reload `start()` → loading 1s → setSelectedRowKeys([]) 一次性清空两侧。
 * 故 `selectedKeys` prop 默认 [] 合理（初始无选择是有效态）。
 *
 * === antd demo 要素（S8 受控）===
 *
 * - `rowSelection.selectedRowKeys` **受控**（外部 useState 驱动）。
 * - `onChange(keys, rows)`：antd demo 用 console.log。
 * - 顶部操作区：
 *     * `Reload` 按钮（`type="primary"`，`disabled={!hasSelected}`，`loading` 态）。
 *     * 点击 `start()` → `setLoading(true)` → `setTimeout 1000ms` → `setSelectedRowKeys([])` +
 *       `setLoading(false)`（模拟 ajax 完成后清空选中）。
 *     * `hasSelected ? 'Selected N items' : null` 文案。
 * - 数据：46 行（Edward King 0..45，age 32，address `London, Park Lane no. i`）——静态导出，
 *   无 T1 空表问题。
 * - columns：Name/Age/Address（纯文本，无 render）。
 *
 * === 两侧保留的差异 ===
 *
 * - antd demo 默认分页（10/页）；**data-grid 默认不分页（S11 已知差异 §9）**。本 demo
 *   **右栏 antd 显式传 `pagination={false}`**（取消 antd 默认分页），与左栏 data-grid
 *   对齐——46 行全显（选中/批量清空在 46 行全显场景下更直观 diff）。
 * - 两侧 `<Table>` 同款 columns（纯文本 Name/Age/Address）+ 同款 rowSelection 受控（selectedRowKeys
 *   + onChange），行为完全等价，无视觉差异。
 *
 * === 拆子文件（task #54：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：selectedRowKeys/loading state + start() Reload 逻辑 + useVirtualization
 * + DemoToolbar(顶部操作区 Reload + Selected N items) + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX 与 columns 拆到子文件（受控 props 驱动）：
 *   - `./row-selection-and-operation.dg`：`RowSelectionAndOperationDg({selectedKeys, onSelectedKeysChange, virtual})`
 *   - `./row-selection-and-operation.antd`：`RowSelectionAndOperationAntd({selectedKeys, onSelectedKeysChange, virtual})`
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `RowSelectionAndOperationDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Button, Flex } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（受控 props 驱动）。RecordType/dataSource 现在
//   由子文件各自 import row-selection-and-operation.shared；父文件不再需要（state 提升后只需 React.Key 类型）。
import RowSelectionAndOperationDg from './row-selection-and-operation.dg'
import RowSelectionAndOperationAntd from './row-selection-and-operation.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function RowSelectionAndOperationDemo() {
  // ★ 共享状态（提升到父）：同一组 state 同时驱动两侧表格 + 顶部操作区。
  // 选择 state 提升原因：顶部 Reload 按钮需直接操作「批量清空选择」（SOP 外部控制选择场景）。
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  // 虚拟化开关（决策 7）：顶栏 Switch ON 时两侧 Table 接入 virtual + scroll.y。
  const { virtual } = useVirtualization()
  // Reload 按钮的 loading 态（1s 模拟 ajax）。
  const [loading, setLoading] = useState(false)

  // 模拟 ajax：点 Reload → loading 1s → 清空选中 + 取消 loading（两侧同步）。
  const start = () => {
    setLoading(true)
    // ajax request after empty completing
    setTimeout(() => {
      setSelectedRowKeys([])
      setLoading(false)
    }, 1000)
  }

  const hasSelected = selectedRowKeys.length > 0

  return (
    <div style={{ padding: 24 }}>
      {/*
        ★ 顶部全宽操作区：antd 原始结构即"顶部操作区"（Reload + Selected N items），
        作为共享控制条全宽置于 SplitDemo 上方——同一组 selectedRowKeys/loading state 同时
        驱动两侧表格与按钮态。
      */}
      <DemoToolbar>
        <Flex align="center" gap="medium">
          {/* 决策 6：antd Button type=primary + loading（关闭 §9 S8 Reload 原生 button 待办）。 */}
          <Button type="primary" onClick={start} disabled={!hasSelected} loading={loading}>
            Reload
          </Button>
          {hasSelected ? `Selected ${selectedRowKeys.length} items` : null}
        </Flex>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列 + 选择列=4 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。46 行全显（无分页），
        SplitDemo pane body 内独立滚动。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <RowSelectionAndOperationDg
            selectedKeys={selectedRowKeys}
            onSelectedKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
        right={
          <RowSelectionAndOperationAntd
            selectedKeys={selectedRowKeys}
            onSelectedKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B8 / S8 受控）：</strong>
          左右并排呈现 data-grid 与 antd row-selection-and-operation demo（受控 selectedRowKeys +
          Reload 批量操作清空）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>受控 selectedRowKeys</strong>：两侧 <code>rowSelection.selectedRowKeys</code>
              共用同一 state（真理源在 Demo 根组件），勾选任一侧 → 顶部 Reload 启用 +
              <code> Selected N items</code>。
            </li>
            <li>
              <strong>批量清空（核心验证）</strong>：点顶部 <code>Reload</code> → loading 1s →
              <code> setSelectedRowKeys([])</code> → <strong>两侧所有行 checkbox + 表头全选框
              同步清空</strong>为未选态，"Selected N items" 消失，Reload 再次 disabled。
              验证 M5 受控 selectedRowKeys "外部 setState → UI 同步" 链路。
            </li>
            <li>
              <strong>onChange 共用</strong>：两侧 onChange 都写回同一 selectedRowKeys state，
              console.log 各自入参。
            </li>
            <li>
              <strong>Reload 按钮</strong>：决策 6——两侧均用 antd <code>&lt;Button type="primary"
              loading&gt;</code>（关闭 §9 S8 Reload 原生 button 待办；data-grid 改造前原生
              <code>&lt;button&gt;</code> 自绘已替换为 antd Button，与右栏对齐）。
            </li>
            <li>
              <strong>分页</strong>：antd demo 默认分页 10/页，本 demo 右栏 antd 显式传
              <code> pagination={'{'}false{'}'}</code> 取消默认分页 → 两侧 46 行全显对照。
              分页本身属 S11。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
