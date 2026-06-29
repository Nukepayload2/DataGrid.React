/**
 * 复刻 antd row-selection demo：`G:\Projects\ant-design\components\table\demo\row-selection.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（rowSelection type 切换 + getCheckboxProps
 *   禁用 "Disabled User" 行 + onChange 回调）。type 用原生 `<input type="radio">` 最小 RadioGroup
 *   （data-grid 引擎不依赖 antd 本体控件）。
 * - **右栏（antd Table）**：忠实复刻 antd row-selection demo（antd `<Radio.Group>` + antd
 *   `<Divider>` + antd 原生 rowSelection）。
 * - **共享控制条**：`Selection Type` Radio.Group（Checkbox/Radio 切换），同一个 state
 *   同时驱动两侧 `rowSelection.type`；切换 type 时同步清空 selectedKeys（避免 checkbox→radio
 *   残留多选），**两侧同步清空**。
 * - **共享状态**：`selectedKeys`（受控）+ `selectionType`，**同一组 state 同时驱动两侧**；
 *   两侧 onChange 都写回同一个 selectedKeys，diff 选中差异（§9 disabled 行灰底差异对照）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/row-selection.shared.ts`。
 *
 * === ★ 行选择 state 处理（SOP 提升）===
 *
 * 顶部控制条需直接操作「切 type 时清空选择」→ 选择 state **提升到父**（而非子组件自管）：
 *   - `selectedKeys` + `selectionType` 在父组件 useState；
 *   - 两侧子组件均受控（selectedRowKeys = 父 props，onChange → onSelectedKeysChange 写回父）；
 *   - type 切换通过 onTypeChange 回调，父同时 setSelectionType + setSelectedKeys([])，两侧同步。
 * 故 `selectedKeys` prop 默认 [] 合理（初始无选择是有效态）。
 *
 * === antd demo 要素（M5）===
 *
 * - 顶部 Radio.Group 切换 type（'checkbox' | 'radio'）。
 * - Table 配 `rowSelection={{ type, onChange, getCheckboxProps }}`：
 *     * onChange(selectedRowKeys, selectedRows)：antd demo 用 console.log。
 *     * getCheckboxProps(record)：禁用 "Disabled User" 行（record.name === 'Disabled User'），
 *       并透传 name（antd demo 同款）。
 * - 数据：4 行，最后一行被禁用（_compare/row-selection.shared.ts，静态导出 → 无 T1 空表问题）。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **type 控件**：左栏用原生 `<input type="radio">` 最小 RadioGroup（决策 6 允许非核心控件
 *    用 antd，但 data-grid 引擎本身不依赖 antd 本体，保留改造前的原生实现）；右栏 antd
 *    `<Radio.Group>`。
 * 2. **分隔线**：左栏用 `border-top`（颜色 var(--ant-color-border-secondary)）；右栏 antd `<Divider>`。
 * 3. **onChange 回调签名**：data-grid `onChange(keys, rows, info)` 三参；antd `onChange(keys, rows)`
 *    两参。两侧均 console.log 实际入参（对照可看 console）。
 *
 * === §11 row-selection 外观对齐说明（★ disabled 行无灰底属正确，非差异）===
 *
 * 原 §9 登记「M5 disabled 行无整行灰底」曾误判为差异——经 antd 6.4.4 源码核实为**错误登记**：
 * antd selection.ts/index.ts 无 disabled 行背景规则，disabled 视觉仅来自 Checkbox 组件自身
 * （colorBgContainerDisabled 作用于 16×16 方框）。data-grid SelectionInput 渲染 antd Checkbox/Radio
 * + 透传 disabled → 视觉逐像素对齐（整行白底 + 方框灰）——**无差异，无需修**，本任务不新增
 * dg-row-disabled 类。
 *
 * 选择列 padding（§11）：antd selection.ts:49-61 给选择列单独设 paddingXS(4px)，已在 table.css
 * `.dg-cell[data-column-key='__dg_selection__']` 收紧对齐。
 *
 * === 拆子文件（task #54：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：selectionType/selectedKeys state + useVirtualization +
 * DemoToolbar(Radio.Group Selection Type) + SplitDemo 外壳 + children 对照说明。两侧表格 JSX 与
 * columns 拆到子文件（受控 props 驱动）：
 *   - `./row-selection.dg`：`RowSelectionDg({selectionType, selectedKeys, onTypeChange, onSelectedKeysChange, virtual})`
 *   - `./row-selection.antd`：`RowSelectionAntd({selectionType, selectedKeys, onTypeChange, onSelectedKeysChange, virtual})`
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `RowSelectionDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Radio, Space, theme } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + columns 由子组件提供（受控 props 驱动）。RecordType/data 现在由
//   子文件各自 import row-selection.shared；父文件不再需要（state 提升后只需 React.Key 类型）。
import RowSelectionDg from './row-selection.dg'
import RowSelectionAntd from './row-selection.antd'

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

type SelectionType = 'checkbox' | 'radio'

export default function RowSelectionDemo() {
  // ★ 共享状态（提升到父）：同一组 state 同时驱动两侧表格。
  // 选择 state 提升原因：顶部控制条需直接操作「切 type 时清空选择」（SOP 外部控制选择场景）。
  const [selectionType, setSelectionType] = useState<SelectionType>('checkbox')
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  // 全局虚拟化开关接入：开关 ON 时两侧 Table 接入 virtual + scroll.y。
  const { virtual } = useVirtualization()
  const { token } = theme.useToken()

  // 切换 type 时清空已选（避免 checkbox→radio 时残留多选），同步两侧。
  const handleTypeChange = (v: SelectionType) => {
    setSelectionType(v)
    setSelectedKeys([])
  }

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一组 state 同时驱动两侧表格。 */}
      <DemoToolbar>
        <Space>
          <span style={{ color: token.colorTextSecondary }}>Selection Type:</span>
          <Radio.Group
            onChange={(e) => handleTypeChange(e.target.value as SelectionType)}
            value={selectionType}
          >
            <Radio value="checkbox">Checkbox</Radio>
            <Radio value="radio">Radio</Radio>
          </Radio.Group>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x + 选择列=4 列）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <RowSelectionDg
            selectionType={selectionType}
            selectedKeys={selectedKeys}
            onTypeChange={handleTypeChange}
            onSelectedKeysChange={setSelectedKeys}
            virtual={virtual}
          />
        }
        right={
          <RowSelectionAntd
            selectionType={selectionType}
            selectedKeys={selectedKeys}
            onTypeChange={handleTypeChange}
            onSelectedKeysChange={setSelectedKeys}
            virtual={virtual}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B8 / M5）：</strong>
          左右并排呈现 data-grid 与 antd row-selection demo（type 切换 + getCheckboxProps 禁用 +
          onChange 回调）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Selection Type</strong>：顶部 Radio.Group 同一个 state 同时驱动两侧
              <code> rowSelection.type</code>（checkbox / radio）；切换时两侧 selectedKeys 同步清空。
            </li>
            <li>
              <strong>getCheckboxProps</strong>：两侧同款判定
              <code> record.name === 'Disabled User'</code>，该行 checkbox/radio 禁用、不参与全选。
            </li>
            <li>
              <strong>onChange</strong>：两侧 onChange 都写回同一 <code>selectedKeys</code> state
              （受控），console.log 各自入参（data-grid 三参含 info，antd 两参）。
            </li>
            <li>
              <strong>★ §11 disabled 行视觉（非差异）</strong>：两侧 <strong>"Disabled User"</strong>
              整行均<strong>白底</strong>（无灰底）+ 勾选框方框灰。经 antd 6.4.4 源码核实 disabled 视觉
              仅来自 Checkbox 组件自身（<code>colorBgContainerDisabled</code> 作用于 16×16 方框），
              data-grid 的 SelectionInput 渲染 antd Checkbox/Radio + 透传 disabled → 视觉逐像素对齐。
              原 §9「M5 disabled 行无灰底」登记为<strong>误判</strong>（本任务不新增 dg-row-disabled 类）。
            </li>
            <li>
              <strong>★ §11 选择列 padding 修复</strong>：antd <code>selection.ts:49-61</code> 选择列
              单元格 paddingInlineStart/End = <code>paddingXS</code>（4px，不随 size 变化）。data-grid
              原沿用普通 cell padding（large 16/16）→ 32px 列宽下勾选框被挤；本任务在
              <code>.dg-cell[data-column-key='__dg_selection__']</code> 收紧到 paddingXS，与 antd 一致。
            </li>
            <li>
              <strong>type 控件差异</strong>：左栏原生 <code>&lt;input type="radio"&gt;</code> RadioGroup
              （data-grid 引擎不依赖 antd 本体）；右栏 antd <code>&lt;Radio.Group&gt;</code>。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
