/**
 * 复刻 antd `hidden-columns` demo：
 *   `G:\Projects\ant-design\components\table\demo\hidden-columns.tsx`
 *
 * 重点：用 Checkbox 控制列显隐；`column.hidden` 动态切换。
 *
 * === antd demo 要素 ===
 *
 * - 8 列（Column 1..8），dataIndex 全为 `address`，title 各异。
 * - 顶部 `Checkbox.Group` 列出所有列 title，`checkedList` 控制哪些列显示。默认全选。
 * - `newColumns = columns.map((c) => ({ ...c, hidden: !checkedList.includes(c.key) }))`：
 *   不在 checkedList 中的列标记为 hidden。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`column.hidden` → 引擎 grid track `0fr`，
 *   单元格/表头格 `visibility:hidden`，track 不删除保线号稳定）。
 *   注：`.dg-grid` 声明了 `transition: grid-template-columns 0.3s`，但本 demo 列均无 width
 *   （track=max-content，非可动画尺寸），实际为瞬切（CSS 固有约束，非 bug，详见底部说明区）。
 * - **右栏（antd Table）**：忠实复刻 antd hidden-columns demo（antd 原生 `column.hidden`）。
 * - **共享控制条**：antd `<Checkbox.Group>`（两侧共用一个 checkedList 状态，同步驱动两侧）。
 *   改造前 data-grid demo 用原生 `<input type="checkbox">` 最小实现；决策 9 双栏下统一用 antd
 *   `<Checkbox.Group>`（对齐 antd demo 风格，决策 6：非表格核心控件用 antd）。
 * - **共享数据/列**：见 `_compare/hidden-columns.shared.ts`。
 *
 * === 验证点（M6）===
 *
 * 1. 初始：8 列全显，Checkbox.Group 全选。
 * 2. 取消勾选 "Column 3" → 第 3 列平滑收起消失；其它列不动。
 * 3. 同时取消多列 → 多列同时收起/展开。
 * 4. 表头线号稳定：取消/恢复勾选不会导致其它列的标题/数据错位。
 * 5. 两侧同步：同一 checkedList 驱动两侧，列显隐应一致。
 *
 * === 拆子文件（task：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：checkedList state（受控真理源，驱动两侧 + 顶部 Checkbox.Group）
 * + useVirtualization + DemoToolbar(Checkbox.Group) + SplitDemo 外壳 + children 对照说明。
 * 两侧表格 JSX 与各自列定义/hidden 派生拆到子文件：
 *   - `./hidden-columns.dg`：`HiddenColumnsDg({checkedList, virtual})`（左栏）
 *   - `./hidden-columns.antd`：`HiddenColumnsAntd({checkedList, virtual})`（右栏）
 *
 * ★ 状态提升说明：checkedList 必须留父——父渲染顶部 Checkbox.Group 控制条需直接读写它；
 *   且同一 state 驱动两侧同步。子组件接 checkedList 后各自派生 hidden 列（列类型两侧不同：
 *   data-grid ColumnType vs antd TableProps['columns']）。
 *
 * 这样：
 *   - 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `HiddenColumnsDemo`，零编辑开销。
 *   - live 编辑模式：SplitDemoPreview 静态 import 真实子组件，并按 editedDg/editedAntd 替换。
 */

import { useState } from 'react'
import { Checkbox, Divider } from 'antd'
import type { CheckboxOptionType } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import {
  defaultCheckedList,
  rawColumns,
} from './_compare/hidden-columns.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
// ★ 拆子文件后，左/右栏 JSX + 各自列定义 + hidden 派生由子组件提供（props 驱动）。RecordType/data
//   现在由子文件各自 import hidden-columns.shared；父文件不再需要。
import HiddenColumnsDg from './hidden-columns.dg'
import HiddenColumnsAntd from './hidden-columns.antd'

// Checkbox.Group 选项（列 title + key）。
const options = rawColumns.map(({ key, title }) => ({
  label: title,
  value: key,
}))

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function HiddenColumnsDemo() {
  // ★ 共享状态：同一个 checkedList 同时驱动两侧表格 + 顶部 Checkbox.Group（故提升父）。
  const [checkedList, setCheckedList] = useState<Array<string>>([...defaultCheckedList])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y（原两侧均无 scroll）
  const { virtual } = useVirtualization()

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。antd Checkbox.Group（决策 6）。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
        <Divider style={{ margin: '0 0 12px' }}>Columns displayed</Divider>
        <Checkbox.Group
          value={checkedList}
          options={options as CheckboxOptionType[]}
          onChange={(value) => {
            setCheckedList(value as string[])
          }}
        />
      </DemoToolbar>

      {/*
        minPaneWidth=480（8 列窄列，每列内容短，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<HiddenColumnsDg checkedList={checkedList} virtual={virtual} />}
        right={<HiddenColumnsAntd checkedList={checkedList} virtual={virtual} />}
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd hidden-columns demo，
          共享 Checkbox.Group 同步驱动两侧 8 列显隐。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>column.hidden</strong>：不在 checkedList 的列标记 hidden。左栏 data-grid 走
              grid track <code>0fr</code>（track 不删除，线号稳定）；右栏 antd 走原生 hidden。
            </li>
            <li>
              <strong>过渡动画（CSS 固有约束，非 bug）</strong>：引擎在 <code>.dg-grid</code> 上声明了
              <code>transition: grid-template-columns 0.3s ease</code>，CSS 允许对 track size 列表逐项
              插值——但<strong>仅当 track size 是可动画尺寸（px / fr / %）时</strong>。本 demo 8 列均未设
              <code>width</code>，track size 为 <code>max-content</code>（非可动画尺寸），<code>max-content → 0fr</code>
              CSS 引擎无法逐项插值，故<strong>实际表现为瞬切</strong>（与右栏 antd 原生 hidden 视觉等价，均即时切换）。
              欲观察 0.3s 平滑动画，需给列设固定 <code>width</code>（如 <code>resizable</code> demo 拖拽定宽后隐藏可见）。
              这是 CSS Grid 的固有约束（非 data-grid 缺陷），不强制对齐，此处如实标注。
            </li>
            <li>
              <strong>0fr track 不删除（线号稳定）</strong>：隐藏列在 <code>grid-template-columns</code> 中仍占一条
              <code>0fr</code> track，取消/恢复勾选不会导致其它列标题/数据错位（左栏 data-grid 线号恒稳；
              右栏 antd 原生 hidden 重渲染亦稳）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
