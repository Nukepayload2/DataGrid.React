/**
 * 复刻 antd reset-filter demo：`G:\Projects\ant-design\components\table\demo\reset-filter.tsx`。
 *
 * === antd demo 要素（S4 受控筛选 + 排序 + 外部重置）===
 *
 * - 三列均带 `key`（受控重置依赖 column.key——引擎 resolveColumnSortKey/resolveFilterKey
 *   优先取 column.key，无 key 才回退 dataIndex；antd reset-filter demo 所有列显式 key）。
 * - Name 列：`filters`（Joe/Jim）+ `onFilter`（名字包含 value）+ `sorter`（按名字长度）；
 *   受控 `filteredValue: filteredInfo.name || null` + `sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null`。
 * - Age 列：`sorter`（数值）；受控 `sortOrder`（无 filters）。
 * - Address 列：`filters`（London/New York）+ `onFilter` + `sorter`（按地址长度）；受控 filteredValue + sortOrder。
 * - 三按钮（antd Button，决策 6 非核心控件用 antd）：
 *     * Sort age：外部把 sortedInfo 设为 `{ order: 'descend', columnKey: 'age' }` → Age 列降序。
 *     * Clear filters：setFilteredInfo({}) → 清空所有 filteredValue（受控 null）。
 *     * Clear filters and sorters：同时清空 filteredInfo + sortedInfo → 表格回到全量未排序。
 * - `onChange(pagination, filters, sorter)`：把 filters/sorter 写回外部 state（受控真理源）。
 *
 * === 受控组合确认（S1 + S3 已有能力）===
 *
 * data-grid 的受控判定：
 *   - 排序（useSorter）：列传 `sortOrder`（含 null 显式受控）→ controlledStates 非空 → isControlled=true
 *     → 引擎不主动排序，仅按 sortOrder 渲染图标 + 触发 onChange。多列可同时受控。
 *   - 筛选（useFilter）：每列独立判定 `filteredValue !== undefined`（含 null/[] 显式受控）→
 *     该列状态由外部真理源驱动；全表所有可筛选列受控 → isFullyControlled=true → 引擎不主动过滤。
 *   - 两者独立，可同时受控（filteredValue 与 sortOrder 来自不同字段）。
 *   - 受控模式下引擎不主动改状态，外部 state 是唯一真理源；onChange 仅通知，状态由调用方更新。
 * 本任务**无需补充任何引擎能力**——S1/S3 已完整支持受控组合。
 *
 * === 重置逻辑 ===
 *
 * 重置 = 外部把受控 state 清空：
 *   - 清筛选：setFilteredInfo({}) → 各列 `filteredInfo.name/address` 为 undefined → `filteredValue: undefined || null`
 *     即 null → 引擎渲染漏斗为灰态、不过滤。
 *   - 清排序：setSortedInfo({}) → 各列 `sortedInfo.columnKey === 'xxx'` 均 false → `sortOrder: null`
 *     → 引擎渲染无序图标、不排序。
 *   - 表格回到全量未排序（与 antd reset-filter 行为一致）。
 *
 * 依赖 column.key：受控外部 state 以 key（'name'/'age'/'address'）为索引（`filteredInfo.name`、
 * `sortedInfo.columnKey === 'name'`）。引擎 resolveColumnSortKey/resolveFilterKey 优先取 column.key，
 * 故列必须指定 key（或 dataIndex 作为回退）才能正确匹配外部 state。与 antd reset-filter 要求一致。
 *
 * === ellipsis 说明（S20 已落地）===
 *
 * antd demo 三列均带 `ellipsis: true`（超长文本省略号 + title 悬浮提示）。S20 已实现：
 * `ellipsis: true` 列的单元格 + 表头加 `dg-cell-ellipsis` 类（overflow:hidden + white-space:nowrap
 * + text-overflow:ellipsis），hover 显示 native title 完整内容。本 demo 三列同时是 sortable/filterable，
 * 表头 ellipsis 作用于 `.dg-column-title`（右侧排序/筛选图标不被省略）。
 *
 * === 验证点（S4）===
 *
 * 1. 初始：表格全量 4 行，无筛选无排序（filteredInfo/sortedInfo 均为空对象）。
 * 2. 点 Name 漏斗勾选 Joe → 只剩名字含 Joe 的行；漏斗变 Filled 高亮。
 * 3. 点 Name 表头排序 → 按名字长度排序；排序图标激活。
 * 4. 点 Sort age 按钮 → Age 列降序（外部 setSortedInfo），无论之前排序如何。
 * 5. 点 Clear filters → 所有筛选清空（漏斗恢复灰态），排序保留。
 * 6. 点 Clear filters and sorters → 筛选 + 排序全清，表格回到全量未排序初始态。
 * 7. onChange 回调：console.log filters/sorter，与外部 state 同步。
 * 8. 回归：head / multiple-sorter demo 不受影响。
 */

import { useState } from 'react'
import { Button, Space } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
}

const data: DataType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

// 受控 state 类型（对齐 antd demo 的 Filters / Sorts 推导）。
type OnChange = NonNullable<TableProps<DataType>['onChange']>
type Filters = Parameters<OnChange>[1]
type GetSingle<T> = T extends (infer U)[] ? U : never
type Sorts = GetSingle<Parameters<OnChange>[2]>

export default function ResetFilterDemo() {
  const [filteredInfo, setFilteredInfo] = useState<Filters>({})
  const [sortedInfo, setSortedInfo] = useState<Sorts>({})

  const handleChange: OnChange = (_pagination, filters, sorter) => {
    // eslint-disable-next-line no-console
    console.log('reset-filter demo onChange params:', { filters, sorter })
    setFilteredInfo(filters)
    setSortedInfo(sorter as Sorts)
  }

  // 清空所有筛选（保留排序）。
  const clearFilters = () => {
    setFilteredInfo({})
  }

  // 清空所有筛选 + 排序（回到全量未排序初始态）。
  const clearAll = () => {
    setFilteredInfo({})
    setSortedInfo({})
  }

  // 外部设置 Age 列降序。
  const setAgeSort = () => {
    setSortedInfo({
      order: 'descend',
      columnKey: 'age',
    })
  }

  const columns: ColumnType<DataType>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filters: [
        { text: 'Joe', value: 'Joe' },
        { text: 'Jim', value: 'Jim' },
      ],
      // 受控 filteredValue：外部 filteredInfo.name 驱动；无则 null（不清筛选）。
      filteredValue: filteredInfo.name || null,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.length - b.name.length,
      // 受控 sortOrder：仅当 sortedInfo.columnKey === 'name' 时取 order，否则 null。
      sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null,
      // S20：ellipsis 视觉（超长文本省略号 + title 提示）；本 demo 三列均启用。
      ellipsis: true,
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
      sorter: (a, b) => a.age - b.age,
      sortOrder: sortedInfo.columnKey === 'age' ? sortedInfo.order : null,
      ellipsis: true,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      filters: [
        { text: 'London', value: 'London' },
        { text: 'New York', value: 'New York' },
      ],
      filteredValue: filteredInfo.address || null,
      onFilter: (value, record) => record.address.includes(value as string),
      sorter: (a, b) => a.address.length - b.address.length,
      sortOrder: sortedInfo.columnKey === 'address' ? sortedInfo.order : null,
      ellipsis: true,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={setAgeSort}>Sort age</Button>
        <Button onClick={clearFilters}>Clear filters</Button>
        <Button onClick={clearAll}>Clear filters and sorters</Button>
      </Space>
      <Table<DataType> columns={columns} dataSource={data} onChange={handleChange} />
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
          <b>S4 受控筛选 + 排序 + 重置</b>（对齐 antd reset-filter demo）：
        </p>
        <p style={{ margin: 0 }}>
          - 三列均带 <code>key</code>（受控重置依赖 column.key）+ <code>filters</code>/<code>onFilter</code>/<code>sorter</code>。
        </p>
        <p style={{ margin: 0 }}>
          - 受控 <code>filteredValue</code>（来自 <code>filteredInfo</code>）+ <code>sortOrder</code>
          （来自 <code>sortedInfo</code>）；引擎不主动改状态，外部 state 是唯一真理源。
        </p>
        <p style={{ margin: 0 }}>
          - <code>Sort age</code>：外部设 Age 降序；<code>Clear filters</code>：清筛选保排序；
          <code>Clear filters and sorters</code>：全清回到初始态。
        </p>
        <p style={{ margin: 0 }}>
          - S20 ellipsis：三列均启用（超长文本省略号 + hover title 提示）。
        </p>
      </div>
    </div>
  )
}
