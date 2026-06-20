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
 * - **左栏（data-grid Table）**：行为与改造前一致（`column.hidden` → 引擎 grid track `0fr` 过渡，
 *   单元格/表头格 `visibility:hidden`，`.dg-grid` `transition: grid-template-columns 0.3s` 平滑）。
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
 */

import { useState } from 'react'
import { Checkbox, Divider, Table as AntdTable } from 'antd'
import type { CheckboxOptionType, TableProps } from 'antd'
import type { ColumnType } from '../table'
import { Table } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import {
  data,
  defaultCheckedList,
  rawColumns,
  type RecordType,
} from './_compare/hidden-columns.shared'

// 左栏 data-grid 列定义。
const dgColumns: ColumnType<RecordType>[] = rawColumns.map((c) => ({ ...c }))
// 右栏 antd 列定义。
const antdColumns: NonNullable<TableProps<RecordType>['columns']> = rawColumns.map((c) => ({
  ...c,
}))

// Checkbox.Group 选项（列 title + key）。
const options = rawColumns.map(({ key, title }) => ({
  label: title,
  value: key,
}))

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function HiddenColumnsDemo() {
  // ★ 共享状态：同一个 checkedList 同时驱动两侧表格。
  const [checkedList, setCheckedList] = useState<Array<string>>([...defaultCheckedList])

  // 不在 checkedList 的列标记为 hidden（对齐 antd demo 写法）。
  const dgNewColumns = dgColumns.map((item) => ({
    ...item,
    hidden: !checkedList.includes(item.key as string),
  }))
  const antdNewColumns = antdColumns.map((item) => ({
    ...item,
    hidden: !checkedList.includes(item.key as string),
  }))

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。antd Checkbox.Group（决策 6）。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Divider style={{ margin: '0 0 12px' }}>Columns displayed</Divider>
        <Checkbox.Group
          value={checkedList}
          options={options as CheckboxOptionType[]}
          onChange={(value) => {
            setCheckedList(value as string[])
          }}
        />
      </div>

      {/*
        minPaneWidth=480（8 列窄列，每列内容短，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType> columns={dgNewColumns} dataSource={data} />
        }
        right={
          <AntdTable<RecordType> columns={antdNewColumns} dataSource={data} />
        }
      >
        <div>
          <strong>对照说明（决策 9 T1）：</strong>左右并排呈现 data-grid 与 antd hidden-columns demo，
          共享 Checkbox.Group 同步驱动两侧 8 列显隐。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>column.hidden</strong>：不在 checkedList 的列标记 hidden。左栏 data-grid 走
              grid track <code>0fr</code> 过渡（<code>transition: grid-template-columns 0.3s</code>）；
              右栏 antd 走原生 hidden。
            </li>
            <li>
              <strong>过渡动画</strong>：左栏 data-grid 有 0.3s 平滑收起/展开动画；右栏 antd 即时切换。
              对照两侧动画差异。
            </li>
            <li>
              <strong>表头线号稳定</strong>：取消/恢复勾选不应导致其它列标题/数据错位（两侧均应稳定）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
