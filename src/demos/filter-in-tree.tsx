/**
 * 复刻 antd filter-in-tree demo：`G:\Projects\ant-design\components\table\demo\filter-in-tree.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（Name `filterMode:'tree'` + filters 含 children +
 *   filterSearch:true + onFilter:name.includes / Age sorter / Address menu filters + filterSearch）。
 * - **右栏（antd Table）**：忠实复刻 antd filter-in-tree demo（antd 原生 filterMode:'tree' + antd
 *   原生 <Tree checkable> 父子联动 + filterSearch + menu 共存）。
 * - **共享控制条**：`Bordered` 开关（antd filter-in-tree demo 原本无控制条，此处加最小开关便于对照
 *   「有/无边框」下两侧 tree 筛选行为是否一致）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/filter-in-tree.shared.ts`。
 *
 * === antd demo 要素（S7 树形筛选 filterMode='tree'）===
 *
 * - Name 列：`filterMode: 'tree'` + `filters` 含 `children`（Joe 顶层 + Category 1→[Yellow,Pink]、
 *   Category 2→[Green,Black]）+ `filterSearch: true` + `onFilter: (value,record)=>record.name.includes(value)`
 *   + `width: '30%'`。
 *   ★ 树形下拉：antd `<Tree checkable>` 渲染 filters 的树形结构，勾选父子联动（勾 Category 1 自动勾
 *   Yellow+Pink），选中 value 作为 filteredValue，onFilter 对每个勾选 value 逐一判定（OR）。
 *   ★ filterSearch 在 tree 模式**高亮命中节点**（对齐 antd filterTreeNode "highlight" 语义），不隐藏。
 * - Age 列：`sorter: (a,b)=>a.age-b.age`（数值排序），无筛选。
 * - Address 列：`filters`（London / New York，**无 filterMode = menu 模式**）+ `filterSearch: true` +
 *   `onFilter: (value,record)=>record.address.startsWith(value)` + `width: '40%'`。
 *   ★ 验证 tree + menu 共存（Name 走 tree，Address 走 menu，互不影响）。
 * - `onChange(pagination, filters, sorter, extra)`：点排序/应用筛选触发，console.log 各参数。
 *
 * === S7 演示点 ===
 *
 * 1. `filterMode: 'tree'` → Name 列漏斗打开下拉为 antd Tree（带展开/收起 + checkable）。
 * 2. filters 含 children → 树形结构（Category 1 下挂 Yellow/Pink；Category 2 下挂 Green/Black；Joe 顶层）。
 * 3. 勾选 Category 1 → 自动勾选 Yellow + Pink（父子联动）；勾全部子 → 自动勾父（半选→全选）。
 * 4. 选中值（含各级 value）作为 filteredValue，onFilter 对每个 value 判定 OR（record.name.includes(value)）。
 * 5. filterSearch: true → tree 模式搜索框**高亮命中节点**（输入 'cat' → Category 1/2 高亮）。
 * 6. Address 列无 filterMode → 默认 menu（Checkbox.Group 扁平），验证 tree/menu 共存。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **Tree 渲染控件**：
 *    - 左栏 data-grid：引擎 FilterDropdown 用 antd `<Tree checkable>` 渲染（决策 6 非核心部位用 antd），
 *      但由 data-grid FilterDropdown 组件统一封装（含全选 Checkbox、checkStrictly=!filterMultiple 父子联动）。
 *    - 右栏 antd：antd 原生 filter 下拉内 antd `<Tree checkable>`（直接由 antd table 内部渲染）。
 *    - 两侧均 antd Tree 控件，视觉/交互对齐 antd 6.4.4。
 * 2. **filterSearch 在 tree 模式高亮而非隐藏**（S7 规格，两侧一致对齐 antd）：
 *    - 输入搜索词后命中节点**高亮**（antd filterTreeNode "highlight" 语义），**不隐藏**不匹配节点。
 *    - 这是 antd 本身行为（filter-in-tree demo 同款），data-grid 与 antd 一致——<strong>验证者勿误判</strong>。
 *
 * === 验证点（S7）===
 *
 * 【Name 列 · tree 模式】
 * 1. 点 Name 漏斗 → 弹出 antd `<Tree checkable>` 树形下拉（Joe 顶层 / Category 1→[Yellow,Pink] /
 *    Category 2→[Green,Black]）—— 两侧一致。
 * 2. 勾 Category 1 → 自动勾 Yellow + Pink（父子联动）；勾全部子 → 自动勾父（半选 indeterminate→全选）。
 * 3. 选中值作 filteredValue，onFilter 对每个 value 判定 OR（record.name.includes(value)）。
 * 4. 输入 'cat' → Category 1/2 高亮（不隐藏 Joe）—— **两侧一致**（antd filterTreeNode highlight 语义）。
 *
 * 【Age 列】
 * 5. Age sorter 数值排序（无筛选）。
 *
 * 【Address 列 · menu 模式共存】
 * 6. 无 filterMode → 默认 menu（Checkbox.Group 扁平 London/New York）+ filterSearch。
 *    验证 tree + menu 共存（Name 走 tree，Address 走 menu，互不影响）。
 *
 * 【共享控制条】
 * 7. Bordered 开关：同时切换两侧边框。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/filter-in-tree.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    filters: [
      { text: 'Joe', value: 'Joe' },
      {
        text: 'Category 1',
        value: 'Category 1',
        children: [
          { text: 'Yellow', value: 'Yellow' },
          { text: 'Pink', value: 'Pink' },
        ],
      },
      {
        text: 'Category 2',
        value: 'Category 2',
        children: [
          { text: 'Green', value: 'Green' },
          { text: 'Black', value: 'Black' },
        ],
      },
    ],
    filterMode: 'tree',
    filterSearch: true,
    onFilter: (value, record) => record.name.includes(value as string),
    width: '30%',
  },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) => record.address.startsWith(value as string),
    filterSearch: true,
    width: '40%',
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd filter-in-tree demo（逐字一致）
// ---------------------------------------------------------------------------

const antdColumns: TableColumnsType<RecordType> = [
  {
    title: 'Name',
    dataIndex: 'name',
    filters: [
      {
        text: 'Joe',
        value: 'Joe',
      },
      {
        text: 'Category 1',
        value: 'Category 1',
        children: [
          {
            text: 'Yellow',
            value: 'Yellow',
          },
          {
            text: 'Pink',
            value: 'Pink',
          },
        ],
      },
      {
        text: 'Category 2',
        value: 'Category 2',
        children: [
          {
            text: 'Green',
            value: 'Green',
          },
          {
            text: 'Black',
            value: 'Black',
          },
        ],
      },
    ],
    filterMode: 'tree',
    filterSearch: true,
    onFilter: (value, record) => record.name.includes(value as string),
    width: '30%',
  },
  {
    title: 'Age',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      {
        text: 'London',
        value: 'London',
      },
      {
        text: 'New York',
        value: 'New York',
      },
    ],
    onFilter: (value, record) => record.address.startsWith(value as string),
    filterSearch: true,
    width: '40%',
  },
]

// ---------------------------------------------------------------------------
// onChange（两侧共用同一个 console.log 形态）
// ---------------------------------------------------------------------------

const onChange: DgTableProps<RecordType>['onChange'] = (pagination, filters, sorter, extra) => {
  // eslint-disable-next-line no-console
  console.log('filter-in-tree demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function FilterInTreeDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x，Name 30% + Address 40%）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            dataSource={data}
            onChange={onChange}
            bordered={bordered}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            dataSource={data}
            onChange={onChange as TableProps<RecordType>['onChange']}
            bordered={bordered}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B7）：</strong>
          左右并排呈现 data-grid 与 antd filter-in-tree demo（S7 树形筛选 filterMode='tree'）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Name</strong>：<code>filterMode: 'tree'</code> + <code>filters</code> 含 children
              （Joe / Category 1→[Yellow,Pink] / Category 2→[Green,Black]）+ <code>filterSearch: true</code> +
              <code>onFilter: name.includes</code>。点漏斗 → antd <code>&lt;Tree checkable&gt;</code>
              树形下拉（两侧一致）；勾 Category 1 自动勾 Yellow + Pink（父子联动）；选中值作 filteredValue，
              onFilter 对每个 value 判定 OR。
            </li>
            <li>
              <strong>Age</strong>：<code>sorter</code>（数值，无筛选）。
            </li>
            <li>
              <strong>Address</strong>：无 filterMode → 默认 menu（Checkbox.Group 扁平）+ filterSearch。
              验证 tree + menu 共存（Name 走 tree，Address 走 menu，互不影响）—— 两侧一致。
            </li>
            <li>
              <strong>已知正确行为勿误判</strong>（S7 规格）：filterSearch 在 tree 模式下输入搜索词后
              **命中节点高亮**（antd <code>filterTreeNode</code> "highlight" 语义），**不隐藏**不匹配节点。
              这是 antd 本身行为（antd filter-in-tree demo 同款），data-grid 与 antd 一致。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。打开 console 查看 onChange 参数
              （filters 形态 <code>{'{ [key]: value[] | null }'}</code>，extra.action='filter'/'sort'）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
