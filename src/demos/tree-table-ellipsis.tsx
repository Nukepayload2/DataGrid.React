/**
 * 复刻 antd `tree-table-ellipsis` demo（S25 验收，issue #36583 复现）：
 *   `G:\Projects\ant-design\components\table\demo\tree-table-ellipsis.tsx`
 *
 * === antd demo 要素 ===
 *
 * - 树形 data（children 嵌套）：John Brown sr. 多层嵌套（子→孙），name 超长（重复 6 次）；
 *   Joe Black 无 children（顶层独立行）。
 * - columns：
 *   * Name：`ellipsis: true` + `width: '30%'` + `fixed`（顶部 Switch 受控切换）。
 *   * Age：`width: '12%'`。
 *   * Address：无 width。
 * - `rowSelection={{ columnWidth: 100 }}`：选择列前置（哨兵列）。
 * - `expandable={{ defaultExpandAllRows: true }}`：默认全展开。
 * - 顶部 Switch：`Fixed first column` 切换 Name 列 `fixed`（true/false）。
 *
 * === S25 核心验证点（issue #36583 组合）===
 *
 * issue #36583 是 antd **树形首列 ellipsis + fixed** 的组合 bug（缩进/展开图标在 fixed 列
 * 内渲染异常）。data-grid 复刻此组合验证四机制共存：
 *
 * 1. **树形首列**（Name = 第一个含 dataIndex 的叶子列）：
 *    - 缩进（`level × indentSize`，S13 useTreeData）。
 *    - 展开图标（hasChildren 行，▶/▼，点击 toggle）。
 * 2. **ellipsis 类**（S20）：Name 列加 `dg-cell-ellipsis`（CSS text-overflow:ellipsis）+ native title。
 * 3. **fixed sticky**（M2）：Switch 切到 fixed 时，Name 列 `position:sticky; left:<offset>`，
 *    横向滚动时固定；表头格同侧固定。
 * 4. **rowSelection**（M5）：选择列作为前置哨兵列（columnWidth 100），在 Name 之前。
 *
 * 四机制在引擎 BodyCell 渲染时**正交组合**（GridTable.tsx BodyCell）：
 *   - `info={leafSticky[colIdx]}` 提供 fixed sticky 偏移；
 *   - `column.ellipsis === true` 加 `dg-cell-ellipsis` 类 + title；
 *   - `treeEnabled && colIdx === treeFirstDataColumnIdx` 渲染树形缩进 + 图标（在 .dg-cell-inner 内、
 *     ellipsis 内容之前）。
 * 三者作用于同一单元格的不同层面（定位 / CSS 类 / 内容），不冲突——组合正确工作。
 *
 * === 已知 gap（§9，非本任务范围）===
 *
 * - **S20 ellipsis 视觉省略号不生效**：data-grid `grid-template-columns` 默认 `max-content`
 *   （列宽=内容宽），Name 列 track=content 宽 → cell-inner 不溢出 → 无 `...`。本 demo 同样存在
 *   （Name name 超长撑开列）。ellipsis 类（`dg-cell-ellipsis`）+ title API 已正确，视觉省略号
 *   依赖列宽策略任务（§9）。**不阻塞组合验证**（四机制组合是 S25 核心）。
 * - **width:'30%' 相对值**：data-grid 列宽默认 max-content，`width:'30%'` 可能不识别（相对值）。
 *   若不识别，Name 列走 max-content（name 超长撑开）。这不阻塞组合验证。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: React.ReactNode
  name: string
  age: number
  address: string
  children?: DataType[]
}

const data: DataType[] = [
  {
    key: 1,
    name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
    age: 60,
    address: 'New York No. 1 Lake Park',
    children: [
      {
        key: 11,
        name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
        age: 42,
        address: 'New York No. 2 Lake Park',
      },
      {
        key: 12,
        name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
        age: 30,
        address: 'New York No. 3 Lake Park',
        children: [
          {
            key: 121,
            name: 'John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr. John Brown sr.',
            age: 16,
            address: 'New York No. 3 Lake Park',
          },
        ],
      },
      {
        key: 13,
        name: 'Jim Green sr. Jim Green sr. Jim Green sr. Jim Green sr.',
        age: 72,
        address: 'London No. 1 Lake Park',
        children: [
          {
            key: 131,
            name: 'Jim Green. Jim Green. Jim Green. Jim Green. Jim Green. Jim Green.',
            age: 42,
            address: 'London No. 2 Lake Park',
            children: [
              {
                key: 1311,
                name: 'Jim Green jr. Jim Green jr. Jim Green jr. Jim Green jr.',
                age: 25,
                address: 'London No. 3 Lake Park',
              },
              {
                key: 1312,
                name: 'Jimmy Green sr. Jimmy Green sr. Jimmy Green sr.',
                age: 18,
                address: 'London No. 4 Lake Park',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 2,
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
  },
]

export default function TreeTableEllipsisDemo() {
  // 默认 fixed=true（对齐 antd demo：首列默认固定，Switch 可切换）。
  const [fixed, setFixed] = useState(true)

  const columns: ColumnType<DataType>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      ellipsis: true,
      fixed,
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      width: '12%',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        Fixed first column: <Switch checked={fixed} onChange={setFixed} />
      </Space>
      <Table<DataType>
        columns={columns}
        rowSelection={{ columnWidth: 100 }}
        expandable={{ defaultExpandAllRows: true }}
        dataSource={data}
      />
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>S25 树形首列 ellipsis + fixed 组合</b>（issue #36583 复现，对齐 antd tree-table-ellipsis）：
        </p>
        <p style={{ margin: 0 }}>
          - <code>Name</code> 列 = 树形首列（缩进 + 展开图标，S13）+ <code>ellipsis: true</code>（S20 类 + title）+
          <code>fixed</code>（M2 sticky，Switch 切换）+ <code>width: '30%'</code>。
        </p>
        <p style={{ margin: 0 }}>
          - <code>rowSelection.columnWidth: 100</code>（M5 选择列前置）+ <code>defaultExpandAllRows: true</code>（全展开）。
        </p>
        <p style={{ margin: 0 }}>
          - 四机制在引擎 BodyCell 正交组合（fixed sticky 偏移 + ellipsis CSS 类 + 树形缩进渲染），
          不冲突。已知 gap（§9）：ellipsis 视觉省略号 + 列宽 '30%' 相对值依赖列宽策略任务，不阻塞组合验证。
        </p>
      </div>
    </div>
  )
}
