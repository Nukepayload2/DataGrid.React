/**
 * 复刻 antd reset-filter demo：`G:\Projects\ant-design\components\table\demo\reset-filter.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（受控 filteredValue/sortOrder + 外部按钮一键重置，
 *   三列均带 key + ellipsis）。受控 state 来自共享根组件（filteredInfo/sortedInfo）。
 * - **右栏（antd Table）**：忠实复刻 antd reset-filter demo（antd 原生受控 filteredValue/sortOrder +
 *   antd Button 外部按钮重置）。
 * - **共享控制条**：`Bordered` 开关 + 三按钮（`Sort age` / `Clear filters` /
 *   `Clear filters and sorters`），同一组 `filteredInfo`/`sortedInfo` state 同时驱动两侧受控
 *   filteredValue/sortOrder + 表格行为。点任一按钮，两侧 state 同步变化、两侧表格同步响应。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/reset-filter.shared.ts`。
 *
 * === antd demo 要素（S4 受控筛选 + 排序 + 外部重置）===
 *
 * - 三列均带 `key`（受控重置依赖 column.key——引擎 resolveColumnSortKey/resolveFilterKey
 *   优先取 column.key，无 key 才回退 dataIndex；antd reset-filter demo 所有列显式 key）。
 * - Name 列：`filters`（Joe/Jim）+ `onFilter`（名字包含 value）+ `sorter`（按名字长度）；
 *   受控 `filteredValue: filteredInfo.name || null` +
 *   `sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null`。
 * - Age 列：`sorter`（数值）；受控 `sortOrder`（无 filters）。
 * - Address 列：`filters`（London/New York）+ `onFilter` + `sorter`（按地址长度）；受控 filteredValue + sortOrder。
 * - 三按钮（antd Button，决策 6 非核心控件用 antd）：
 *     * Sort age：外部把 sortedInfo 设为 `{ order: 'descend', columnKey: 'age' }` → Age 列降序。
 *     * Clear filters：setFilteredInfo({}) → 清空所有 filteredValue（受控 null）。
 *     * Clear filters and sorters：同时清空 filteredInfo + sortedInfo → 表格回到全量未排序。
 * - `onChange(pagination, filters, sorter)`：把 filters/sorter 写回外部 state（受控真理源）。
 *   ★ 两侧共用同一个 onChange（写同一组 state）——这样表格内部操作（点表头排序 / 点漏斗筛选）
 *   也会同步驱动两侧（左栏点 Age 排序，右栏 Age 也跟随排序）。
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
 *   - 表格回到全量未排序（与 antd reset-filter 行为一致）。两侧 state 同步清空 → 两侧表格同步回到初始态。
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
 * === S5 经验（验证者勿误判）===
 *
 * 1. **clearFilters() 不立即清表**：S5 上下文同款经验——但本 demo 重置按钮是 **外部受控清空**
 *    （setFilteredInfo({})），非 filterDropdown 内 clearFilters()——故**立即生效**（受控 null
 *    立即重渲染），与 S5 那条「filterDropdown 内草稿不立即清」无关，勿混淆。
 * 2. **sortDirections 第三次回 null**（S5 经验，本 demo 三列无显式 sortDirections 故用默认
 *    `['ascend','descend']`）：第三次点击回 null 是 antd 本身循环（antd `nextSortDirection`
 *    与 data-grid `useSorter.ts:163-171` 逐字相同），勿误判。
 *
 * === 验证点（S4）===
 *
 * 1. 初始：表格全量 4 行，无筛选无排序（filteredInfo/sortedInfo 均为空对象）。
 * 2. 点 Name 漏斗勾选 Joe → 两侧只剩名字含 Joe 的行；两侧漏斗变 Filled 高亮。
 * 3. 点 Name 表头排序 → 两侧按名字长度排序；两侧排序图标激活。
 * 4. 点 Sort age 按钮 → 两侧 Age 列降序（外部 setSortedInfo），无论之前排序如何。
 * 5. 点 Clear filters → 两侧所有筛选清空（漏斗恢复灰态），两侧排序保留。
 * 6. 点 Clear filters and sorters → 两侧筛选 + 排序全清，两侧表格回到全量未排序初始态。
 * 7. onChange 回调：console.log filters/sorter，与外部 state 同步。
 * 8. 回归：head / multiple-sorter demo 不受影响。
 */

import { useState } from 'react'
import { Button, Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/reset-filter.shared'

// 受控 state 类型（对齐 antd demo 的 Filters / Sorts 推导）。两侧共用同一组类型。
type OnChange = NonNullable<DgTableProps<RecordType>['onChange']>
type Filters = Parameters<OnChange>[1]
type GetSingle<T> = T extends (infer U)[] ? U : never
type Sorts = GetSingle<Parameters<OnChange>[2]>

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

/** 构造 data-grid 受控列（依赖外部 filteredInfo/sortedInfo）。 */
function buildDgColumns(
  filteredInfo: Filters,
  sortedInfo: Sorts,
): ColumnType<RecordType>[] {
  return [
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
}

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd reset-filter demo（逐字一致）
// ---------------------------------------------------------------------------

/** 构造 antd 受控列（依赖同一份 filteredInfo/sortedInfo）。 */
function buildAntdColumns(
  filteredInfo: Filters,
  sortedInfo: Sorts,
): NonNullable<TableProps<RecordType>['columns']> {
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      filters: [
        { text: 'Joe', value: 'Joe' },
        { text: 'Jim', value: 'Jim' },
      ],
      filteredValue: filteredInfo.name || null,
      onFilter: (value, record) => record.name.includes(value as string),
      sorter: (a, b) => a.name.length - b.name.length,
      sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null,
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
}

// ---------------------------------------------------------------------------
// onChange（两侧共用同一个 state 写回）
// ---------------------------------------------------------------------------

// demo 根组件内构造实例（见 ResetFilterDemo），此处仅提供类型签名占位。

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ResetFilterDemo() {
  // ★ 共享状态：同一个 filteredInfo/sortedInfo 同时驱动两侧表格的受控
  // filteredValue/sortOrder（两侧 column.key 同名，故同一份 state 即可双驱动）。
  const [filteredInfo, setFilteredInfo] = useState<Filters>({})
  const [sortedInfo, setSortedInfo] = useState<Sorts>({})
  // 共享 Bordered 开关。
  const [bordered, setBordered] = useState(false)

  // 两侧共用同一个 onChange：写回同一组 state → 两侧受控同步。
  // （★ 已知 §9 S4：filter 触发时 sorter 字段可能不完整——antd/data-grid 均如此，不修。）
  const handleChange: OnChange = (_pagination, filters, sorter) => {
    // eslint-disable-next-line no-console
    console.log('reset-filter demo onChange params:', { filters, sorter })
    setFilteredInfo(filters)
    setSortedInfo(sorter as Sorts)
  }

  // 清空所有筛选（保留排序）。两侧 state 同步清空。
  const clearFilters = () => {
    setFilteredInfo({})
  }

  // 清空所有筛选 + 排序（回到全量未排序初始态）。两侧 state 同步清空。
  const clearAll = () => {
    setFilteredInfo({})
    setSortedInfo({})
  }

  // 外部设置 Age 列降序。两侧 state 同步设置。
  const setAgeSort = () => {
    setSortedInfo({
      order: 'descend',
      columnKey: 'age',
    })
  }

  const dgColumns = buildDgColumns(filteredInfo, sortedInfo)
  const antdColumns = buildAntdColumns(filteredInfo, sortedInfo)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一组 state 同时驱动两侧表格 + 同一按钮组控制两侧重置。 */}
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
          <Button onClick={setAgeSort}>Sort age</Button>
          <Button onClick={clearFilters}>Clear filters</Button>
          <Button onClick={clearAll}>Clear filters and sorters</Button>
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x；ellipsis 列默认 tableLayout:fixed 撑满 100%）→
        横排阈值 ≈ 976。常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            dataSource={data}
            onChange={handleChange}
            bordered={bordered}
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            dataSource={data}
            onChange={handleChange as TableProps<RecordType>['onChange']}
            bordered={bordered}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B6）：</strong>
          左右并排呈现 data-grid 与 antd reset-filter demo（S4 受控筛选 + 排序 + 外部重置）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>共享受控 state</strong>：同一组 <code>filteredInfo</code>/<code>sortedInfo</code>
              同时驱动两侧受控 <code>filteredValue</code>/<code>sortOrder</code>（两侧 column.key 同名：
              name/age/address）。任一栏点排序/筛选，onChange 写回共享 state → 另一栏同步响应。
            </li>
            <li>
              <strong>三列均带 <code>key</code></strong>（受控重置依赖 column.key）+
              <code>ellipsis: true</code>（S20 超长文本省略号 + hover title）。
              Name/Address 列 <code>filters</code>+<code>onFilter</code>+<code>sorter</code>；
              Age 列 <code>sorter</code>（无 filters）。
            </li>
            <li>
              <strong>Sort age</strong>：外部设两侧 Age 降序；<strong>Clear filters</strong>：
              两侧清筛选保排序；<strong>Clear filters and sorters</strong>：两侧全清回到初始态。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。
            </li>
            <li>
              <strong>已知正确行为勿误判</strong>：① 外部重置按钮是 <em>受控清空</em>
              （setFilteredInfo({}) 立即生效），<strong>非</strong> filterDropdown 内草稿
              clearFilters()（S5 那条不立即清），勿混淆。② <code>sortDirections</code> 耗尽回
              null 是 antd 本身循环（data-grid 与 antd <code>nextSortDirection</code> 逐字相同）。
              ③ §9 S4：filter 触发时 onChange 的 <code>sorter</code> 字段可能不完整——
              data-grid/antd 均如此，非 bug（已知，不修）。
            </li>
            <li>
              <strong>分页对齐</strong>：两栏均显式 <code>pagination=&#123;&#123;&#125;&#125;</code>（antd 默认分页器），
              两侧表底一致出现 disabled 态分页条（4 行 ≤ pageSize）。与受控筛选/排序/重置无关。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
