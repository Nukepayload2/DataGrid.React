/**
 * 复刻 antd filter-search demo：`G:\Projects\ant-design\components\table\demo\filter-search.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（Name filters + filterSearch:true 用默认 **menu 模式** +
 *   Address filters + filterSearch:true / Age sorter / onChange console.log）。
 *   ★ 注意：antd 原版 Name 列带 `filterMode: 'tree'`，data-grid 改造前 demo 有意去掉 tree（S7 未实现
 *   时的简化）保留 menu 模式演示 filterSearch 的「搜索框 + 默认 contains」核心行为。S7 已实现，但本
 *   demo 作为 filterSearch（S6）的 menu 模式演示 demo，保留 menu 模式（与 filter-in-tree demo 的
 *   tree 模式职责分离）。右栏 antd 原样 tree 模式 → 两侧如实呈现「menu vs tree」差异。
 * - **右栏（antd Table）**：忠实复刻 antd filter-search demo（Name `filterMode:'tree'` + filterSearch +
 *   filters 扁平 3 项 [Joe/Category 1/Category 2]；Address filterSearch + filters；Age sorter）。
 * - **共享控制条**：`Bordered` 开关（antd filter-search demo 原本无控制条，此处加最小开关便于对照
 *   「有/无边框」下两侧 filterSearch 行为是否一致）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/filter-search.shared.ts`。
 *
 * === antd demo 要素（S6 筛选项搜索 filterSearch）===
 *
 * - Name 列：`filters`（Joe / Category 1 / Category 2）+ `filterSearch: true` +
 *   `onFilter: (value,record)=>record.name.startsWith(value)` + `width: '30%'`。
 *   ★ antd 原版带 `filterMode: 'tree'`——树形 UI。右栏保留 antd 原样（tree）；
 *   左栏 data-grid 去掉 filterMode（用默认 menu）——两侧 menu vs tree 对照。
 * - Age 列：`sorter: (a,b)=>a.age-b.age`（数值排序），无 filterSearch、无筛选。
 * - Address 列：`filters`（London / New York）+ `filterSearch: true` +
 *   `onFilter: (value,record)=>record.address.startsWith(value)` + `width: '40%'`。
 * - `onChange(pagination, filters, sorter, extra)`：点排序/应用筛选触发，console.log 各参数。
 *
 * === S6 演示点（menu 模式 filterSearch）===
 *
 * 1. filterSearch: true → 内置 menu 面板顶部渲染 antd `<Input>` 搜索框（放大镜前缀 + placeholder 'Search'）。
 * 2. 输入实时过滤筛选项列表（默认匹配：item.text 转字符串 trim+toLowerCase 后**包含**输入即命中）。
 * 3. 输入为空 → 显示全部筛选项（不过滤）。
 * 4. 关闭下拉时清空搜索值（下次打开为空，对齐 antd）。
 * 5. 搜索框只过滤**显示哪些筛选项**，不影响"已勾选的筛选值"——搜索过滤与勾选状态解耦。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **Name 列 filter 模式**：
 *    - 左栏 data-grid：默认 **menu 模式**（未声明 filterMode）—— Checkbox 扁平列表 + 顶部搜索框。
 *    - 右栏 antd：antd 原版 `filterMode: 'tree'` —— antd `<Tree checkable>` 树形 + filterSearch 高亮。
 *    - 两侧 filters 数据结构逐字一致（3 项扁平，无 children）。差异仅在渲染层（menu vs tree）。
 * 2. **filterSearch 在 tree 模式下高亮而非隐藏**（S7 规格）：
 *    - 右栏 antd tree 模式输入搜索词后，antd `<Tree>` 用 `filterTreeNode` 对命中节点**高亮**（变蓝），
 *      不隐藏不匹配节点——这是 antd `filterTreeNode` 的 "highlight" 语义。
 *    - 左栏 data-grid 走 menu 模式（搜索框过滤 Checkbox 列表 → 隐藏不匹配项，contains 匹配）。
 *    - 两侧 filterSearch 的语义各按其模式正确（menu=过滤列表 / tree=高亮节点）。**验证者勿误判**。
 *
 * === 验证点（S6 + S7 共存对照）===
 *
 * 【左栏 data-grid · menu 模式 filterSearch】
 * 1. Name 漏斗 → 打开下拉：顶部有搜索框（放大镜 + 'Search' placeholder）。
 * 2. 输入 'cat' → 只显示 'Category 1' / 'Category 2'（默认 contains，大小写不敏感）。
 * 3. 输入 'joe' → 只显示 'Joe'；输入空 → 显示全部 3 项。
 * 4. 关闭再打开 → 搜索框为空（关闭清空生效）。
 * 5. Address 列同理（搜索 'lon' → 只显示 'London'）。
 * 6. 勾选 Joe → 表格只剩 name 以 'Joe' 开头的行（Joe Black）。
 *
 * 【右栏 antd · tree 模式 filterSearch】
 * 7. Name 漏斗 → 打开为 antd `<Tree checkable>`（3 项扁平，无 children 子节点）。
 * 8. 搜索框输入 'cat' → 命中节点 'Category 1/2' **高亮**（antd filterTreeNode highlight），不隐藏 Joe。
 * 9. 勾 Joe → 表格只剩 Joe Black（onFilter name.startsWith）。
 * 10. Address 列走 menu 模式（无 filterMode）—— 与左栏完全相同。
 *
 * 【共享控制条】
 * 11. Bordered 开关：同时切换两侧边框。
 */

import { useState } from 'react'
import { Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import type { TableColumnsType } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/filter-search.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致（Name 用默认 menu 模式）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    filters: [
      { text: 'Joe', value: 'Joe' },
      { text: 'Category 1', value: 'Category 1' },
      { text: 'Category 2', value: 'Category 2' },
    ],
    // S6：筛选项搜索（默认 contains 匹配）。
    // ★ 改造前 demo 去掉 antd 原版的 filterMode:'tree'，用默认 menu 模式演示 filterSearch。
    //    （tree 模式属 S7 filter-in-tree demo 职责；本 demo 作为 menu 模式 filterSearch 演示。）
    filterSearch: true,
    onFilter: (value, record) => record.name.startsWith(value as string),
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
// 右栏（antd）列定义 —— 忠实复刻 antd filter-search demo（Name 带 filterMode:'tree'）
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
      },
      {
        text: 'Category 2',
        value: 'Category 2',
      },
    ],
    // ★ antd 原版带 filterMode:'tree'——右栏忠实保留（与左栏 menu 模式对照）。
    filterMode: 'tree',
    filterSearch: true,
    onFilter: (value, record) => record.name.startsWith(value as string),
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
  console.log('filter-search demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function FilterSearchDemo() {
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
          左右并排呈现 data-grid 与 antd filter-search demo（S6 筛选项搜索 filterSearch）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Name</strong>：<code>filters</code>（Joe/Category 1/Category 2）+
              <code>filterSearch: true</code> + <code>onFilter: name.startsWith</code>。★
              <strong>左栏 data-grid 用默认 menu 模式</strong>（Checkbox 扁平列表 + 顶部搜索框过滤筛选项，
              默认 contains 匹配）；<strong>右栏 antd 原版 <code>filterMode:'tree'</code></strong>
              （antd <code>&lt;Tree checkable&gt;</code>）。两侧如实差异（menu vs tree）。
            </li>
            <li>
              <strong>Age</strong>：<code>sorter</code> 数值排序（无 filterSearch、无筛选）。
            </li>
            <li>
              <strong>Address</strong>：<code>filters</code>（London/New York）+ <code>filterSearch: true</code>
              + <code>onFilter</code>（两侧均 menu 模式，行为完全一致）。
            </li>
            <li>
              <strong>menu 模式 filterSearch</strong>（左栏 Name + 两侧 Address）：打开下拉顶部有搜索框
              （放大镜 + 'Search' placeholder）；输入实时过滤筛选项（item.text 转小写包含输入即命中，
              大小写不敏感）；输入空显全部；关闭清空搜索值。
            </li>
            <li>
              <strong>tree 模式 filterSearch</strong>（右栏 Name，S7 规格）：输入搜索词后命中节点
              **高亮**（antd <code>filterTreeNode</code> "highlight" 语义），**不隐藏**不匹配节点。
              这是 antd 本身行为，data-grid 的 filter-in-tree demo 同款对齐——<strong>验证者勿误判</strong>。
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
