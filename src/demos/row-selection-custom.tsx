/**
 * 复刻 antd row-selection-custom demo：
 * `G:\Projects\ant-design\components\table\demo\row-selection-custom.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（rowSelection.selections 自定义选择项菜单 +
 *   表头全选框旁下拉箭头 + 内置 SELECTION_ALL/INVERT/NONE + 自定义 odd/even 项 + onChange
 *   console.log）。selectedRowKeys 受控（共享 state）。
 * - **右栏（antd Table）**：忠实复刻 antd row-selection-custom demo（antd `<Table>` + antd
 *   原生 rowSelection.selections）。
 * - **共享状态**：`selectedRowKeys`（受控真理源），**同一组 state 同时驱动两侧**；两侧
 *   onChange 都写回同一 selectedRowKeys。两侧 selections 数组同款（3 内置哨兵 + odd/even
 *   自定义，onSelect 逻辑逐字一致——按 changeableRowKeys 的 index 奇偶筛选）。
 * - **共享数据**：`RecordType` + `dataSource`（46 行 Edward King）见
 *   `_compare/row-selection-custom.shared.ts`。
 *
 * === antd demo 要素（S9 自研任务）===
 *
 * - `rowSelection.selectedRowKeys` 受控（外部 useState 驱动）。
 * - `rowSelection.selections`：自定义选择项数组（含 3 个内置哨兵 + 2 个自定义项 odd/even）：
 *     * `Table.SELECTION_ALL`：全选（引擎内置——选中所有可选行）。
 *     * `Table.SELECTION_INVERT`：反选（引擎内置——可选行中未选→选、已选→清）。
 *     * `Table.SELECTION_NONE`：清空（引擎内置——清空所有可选行）。
 *     * `{ key:'odd', text:'Select Odd Row', onSelect(changeableRowKeys) }`：自定义——
 *       过滤 changeableRowKeys 的偶数 index（antd demo 的 odd 命名如此：`index % 2 !== 0`
 *       返回 false），demo 内 `setSelectedRowKeys(newSelectedRowKeys)`。
 *     * `{ key:'even', text:'Select Even Row', onSelect(changeableRowKeys) }`：自定义——
 *       过滤 changeableRowKeys 的奇数 index，demo 内 `setSelectedRowKeys`。
 * - 表头选择列的全选 checkbox 旁渲染一个下拉箭头，点开显示 selections 菜单。
 * - `onChange` console.log（与 antd demo 一致）。
 * - 数据：46 行（Edward King 0..45，age 32，address `London, Park Lane no. i`）。
 * - columns：Name/Age/Address（纯文本，无 render）。
 *
 * === 两侧保留的差异 ===
 *
 * - 基本逐字复刻（数据/列/selections 数组/onSelect 逻辑一致）。
 * - 内置哨兵类型差异：左栏 `Table.SELECTION_ALL` 来自 data-grid 引擎
 *   （`engine/useRowSelection.ts` 的 `SELECTION_ALL` 同款对象，对齐 antd），右栏 antd
 *   `Table.SELECTION_ALL` 来自 antd 本体。两侧 selections 数组结构等价。
 * - 选中态可视化区（页面下方 "selectedRowKeys: [...]"）：两侧共享同一 state，diff 一致；
 *   antd demo 原本无此区，本 demo 额外加便于无 console 环境验证。
 *
 * === 验证点（S9 + 决策 9）===
 *
 * 【两侧 selections 菜单】
 * 1. 两侧表头全选 checkbox 旁均有下拉箭头（caret-down）。
 * 2. 点箭头 → 弹出菜单，列出 5 项（Select all data / Invert current page /
 *    Clear all data / Select Odd Row / Select Even Row）。前三项文案对齐 antd 6.4.4
 *    默认 enUS（selectionAll/selectInvert/selectNone）。
 * 3. 点 Select all data → 两侧所有 46 行全选；点 Clear all data → 两侧全清；
 *    点 Invert current page → 两侧反选。**两侧共享同一 selectedRowKeys state → 同步生效**。
 * 4. 点 Select Odd Row → 两侧选中 index 0,2,4,...（changeableRowKeys 中偶数 index）；
 *    点 Select Even Row → 两侧选中 index 1,3,5,...。**两侧同步**。
 * 5. onChange 触发 console.log（内置项触发；自定义项 demo 内自行 setState 不走 onChange）。
 * 6. 回归：row-selection / row-selection-and-operation demo 表头无下拉箭头（无 selections）。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：selectedRowKeys state（受控真理源，同时驱动两侧 + 下方可视化区）
 * + useVirtualization + SplitDemo 外壳 + children 对照说明 + 选中态可视化区。两侧表格 JSX
 * 与 columns + 各自 selections 数组拆到子文件：
 *   - `./row-selection-custom.dg`：`RowSelectionCustomDg({selectedRowKeys, onSelectedRowKeysChange, virtual})`（左栏）
 *   - `./row-selection-custom.antd`：`RowSelectionCustomAntd({selectedRowKeys, onSelectedRowKeysChange, virtual})`（右栏）
 *
 * ★ 状态提升说明：selectedRowKeys 必须留父——父渲染页面下方「selectedRowKeys 可视化区」
 *   需直接读它；且同一 state 驱动两侧同步。子组件通过 onSelectedRowKeysChange 回调上抛
 *   （内置项 onChange + 自定义 odd/even 的 onSelect 都经此回调）。
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `RowSelectionCustomDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
// 全局虚拟化开关（决策 7）：顶栏 Switch 全局驱动两侧 Table 的 virtual + scroll.y。
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns + 各自 selections 数组由子组件提供（props 驱动）。
//   RecordType/dataSource 现在由子文件各自 import row-selection-custom.shared；父文件不再需要。
import RowSelectionCustomDg from './row-selection-custom.dg'
import RowSelectionCustomAntd from './row-selection-custom.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function RowSelectionCustomDemo() {
  // ★ 共享状态：同一个 state 同时驱动两侧表格 + 页面下方可视化区（故提升父，子组件只读+回调）。
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([])
  // 虚拟化开关（决策 7）：顶栏 Switch ON 时两侧 Table 接入 virtual + scroll.y。
  const { virtual } = useVirtualization()
  // 主题 token：选中态可视化区文字色 token 化（colorTextSecondary≈rgba(0,0,0,0.65)、
  // colorTextTertiary≈rgba(0,0,0,0.45)），暗主题自适应。
  const { token } = theme.useToken()

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/*
        minPaneWidth=480（窄表，3 列 + 选择列=4 列，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。46 行全显（无分页），
        SplitDemo pane body 内独立滚动。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <RowSelectionCustomDg
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
        right={
          <RowSelectionCustomAntd
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={setSelectedRowKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B9 / S9 自定义选择项）：</strong>
          左右并排呈现 data-grid 与 antd row-selection-custom demo（表头下拉菜单 selections：
          SELECTION_ALL/INVERT/NONE + 自定义 odd/even）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>selections 菜单</strong>：两侧表头全选框旁均有下拉箭头，点开列 5 项
              （Select all data / Invert current page / Clear all data / Odd Row / Even Row）。
            </li>
            <li>
              <strong>odd/even 逻辑</strong>：与 antd demo 逐字一致——
              <code> onSelect(changeableRowKeys)</code> 按 index 奇偶筛选
              （<code>index % 2 !== 0 → false</code> 保留偶 index，反之保留奇 index）。
            </li>
            <li>
              <strong>受控 selectedRowKeys</strong>：两侧 <code>rowSelection.selectedRowKeys</code>
              共用同一 state，内置项 / 自定义项的 setState 都写回同一 state →
              <strong> 两侧同步</strong>（点任一侧菜单项，两侧勾选 UI 同时变化）。
            </li>
            <li>
              <strong>内置哨兵来源差异</strong>：左栏 <code>Table.SELECTION_ALL/INVERT/NONE</code>
              来自 data-grid 引擎；右栏 antd <code>Table.SELECTION_ALL/INVERT/NONE</code>
              来自 antd 本体。结构等价。
            </li>
            <li>
              <strong>onChange</strong>：内置项触发 onChange → console.log；自定义 odd/even
              由 demo 内 onSelect 直接 setState（与 antd 一致，不走 onChange）。
            </li>
            <li>
              <strong>选中态可视化</strong>：页面下方显示共享 <code>selectedRowKeys</code>，
              对照两侧是否同步。antd demo 原本仅 console.log。
            </li>
          </ul>
        </div>
      </SplitDemo>

      {/* 选中态可视化（antd demo 仅 console.log；这里额外页面展示便于无 console 验证）。 */}
      <div style={{ padding: 12, background: token.colorFillQuaternary, borderRadius: 8 }}>
        <strong>selectedRowKeys:</strong>{' '}
        {selectedRowKeys.length === 0 ? (
          <span style={{ color: token.colorTextTertiary }}>(none)</span>
        ) : (
          <code>[{selectedRowKeys.join(', ')}]</code>
        )}
        <div style={{ marginTop: 4, color: token.colorTextSecondary, fontSize: 12 }}>
          点表头全选框旁的下拉箭头，选择 Select all data / Invert current page / Clear all data / Odd Row / Even Row。
          两侧共享同一 selectedRowKeys → 点任一侧菜单项两侧勾选同步。
          打开浏览器 console 可看到 onChange 回调日志（内置项触发；自定义 odd/even 由 demo 内 setState）。
          分页属 S11，本 demo 46 行全显。
        </div>
      </div>
    </div>
  )
}
