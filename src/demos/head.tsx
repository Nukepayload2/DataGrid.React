/**
 * 复刻 antd head demo（排序 + 筛选）：`G:\Projects\ant-design\components\table\demo\head.tsx`。
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为对齐 antd（Name sorter+filters / Age sorter+defaultSortOrder /
 *   Address filters 默认多选 / Table 级 showSorterTooltip / onChange console.log / pagination={{}}）。
 * - **右栏（antd Table）**：忠实复刻 antd head demo（antd 原生 sorter/filters/onFilter/filterMultiple +
 *   antd 原生 filter 下拉 Checkbox/Radio + 确定/重置）。
 * - **共享控制条**：`Bordered` 开关 + `Reset` 按钮（antd head demo 原本无控制条，此处加最小开关便于对照
 *   「有/无边框」下两侧行为是否一致；Reset 用 React key remount 两侧 Table 一次清空所有排序/筛选草稿
 *   与激活态——避免引入受控语义破坏 head demo 的非受控本质）。
 * - **共享数据**：`RecordType` + `data` 见 `_compare/head.shared.ts`。
 *
 * === antd demo 要素（排序 + 筛选共存）===
 *
 * - Name 列：`sorter: (a,b) => a.name.length - b.name.length`（按名字字符串长度排序），
 *   `sortDirections: ['descend']`（点击循环：null → descend → null，不经过 ascend），
 *   `showSorterTooltip: { target: 'full-header' }`（hover 整表头格提示）。
 *   同时带 `filters`（Joe/Jim/Submenu→Green/Black）+ `onFilter`（按名字起始匹配）——
 *   排序 + 筛选共存（S1 + S3 组合，head demo 核心场景）。
 * - Age 列：`sorter: (a,b) => a.age - b.age`（数值排序），`defaultSortOrder: 'descend'`（初始降序）。
 *   无筛选。
 * - Address 列：带 `filters`（London/New York）+ `onFilter`（按地址起始匹配），无 sorter。
 *   默认多选（Checkbox）——与官方 antd demo 逐字一致（官方 head.tsx 此列无 filterMultiple）。
 * - Table 级 `showSorterTooltip: { target: 'sorter-icon' }`（默认 tooltip 绑定到排序图标）。
 * - `onChange(pagination, filters, sorter, extra)`：点击排序/应用筛选触发，console.log 各参数。
 *
 * === 两侧保留的差异 ===
 *
 * 1. **filter 下拉控件**：
 *    - 左栏 data-grid：FilterDropdown 自绘（决策 6 非核心部位用 antd Dropdown/Checkbox/Radio/Button，
 *      但由引擎 FilterDropdown 组件统一渲染）。
 *    - 右栏 antd：antd 原生 filter 下拉（Checkbox/Radio + OK/Reset Button）。
 *    - 两侧行为对齐 antd 6.4.4（filterOnClose 默认 / confirm 应用 / clearFilters 草稿不立即清表）。
 * 2. **Submenu（filters children）属 S7 树形筛选**：
 *    - 左栏 data-grid：扁平化为顶层项参与勾选（不做二级菜单 UI——data-grid 现状，S7 已知简化）。
 *    - 右栏 antd：antd demo 同样声明了 Submenu→children，antd 原生 menu 模式会渲染二级菜单——
 *      **右栏如实呈现 antd 行为**（点 Submenu 弹出二级 Green/Black）。
 *    - 两侧 filters 数据结构完全一致（逐字 antd demo），差异仅在渲染层（一级 vs 二级菜单 UI）。
 *
 * === S5 经验（验证者勿误判）===
 *
 * 1. **clearFilters() 不立即清表**：`clearFilters()` 无参默认 `{confirm:false}`，点 Reset 只清草稿
 *    （Input 清空）、不立即清表，需再 Search（confirm 空草稿）或关闭下拉（filterOnClose）才回全量。
 *    与 antd `onReset`（ant-design\components\table\hooks\useFilter\FilterDropdown.tsx:298-315）逐字一致。
 * 2. **sortDirections 第三次回 null**：`sortDirections:['descend','ascend']` 第三次点击回 null 是
 *    antd 本身循环（antd `nextSortDirection` 与 data-grid `useSorter.ts:163-171` 逐字相同）。
 *
 * === 验证点（S1 + S3）===
 *
 * 【S1 排序】
 * 1. Age 列初始降序（defaultSortOrder: 'descend'）—— 两侧一致。
 * 2. 点击 Age 列表头循环排序（descend → null → ascend → descend）。
 * 3. 点击 Name 列表头：sortDirections=['descend']，循环为 null → descend → null。
 * 4. 单列语义：点击新列清空旧列排序。
 * 5. 排序图标三态；当前排序列表头/表体淡灰底（dg-column-sort）。
 *
 * 【S3 筛选】
 * 6. Name 列漏斗：默认灰；勾选 Joe+Jim 后变 Filled 高亮，表格只剩名字以 Joe/Jim 开头的行（OR）。
 * 7. Address 列漏斗（默认多选 Checkbox）：勾 London+New York → 两地起始地址行并集（OR）。
 * 8. filterOnClose=true（默认）：勾选后点外部/ESC 关闭下拉即应用。
 * 9. 确定按钮：点 OK 也应用；重置按钮：清空当前勾选（草稿），需再关闭/确定才生效（S5 经验 1）。
 * 10. onChange 回调：console.log filters（{ name: [...], address: [...] | null }），extra.action='filter'。
 * 11. 排序 + 筛选叠加：先按 Age 排序，再筛选 Name——筛选结果保持排序顺序（raw → sort → filter）。
 */

import { useState } from 'react'
import { Button, Space, Switch, Table as AntdTable } from 'antd'
import type { TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { data, type RecordType } from './_compare/head.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    showSorterTooltip: { target: 'full-header' },
    // S3：筛选（与排序共存）。filters 含 children（Submenu）——S7 树形筛选，本阶段扁平化为顶层项。
    filters: [
      { text: 'Joe', value: 'Joe' },
      { text: 'Jim', value: 'Jim' },
      {
        text: 'Submenu',
        value: 'Submenu',
        children: [
          { text: 'Green', value: 'Green' },
          { text: 'Black', value: 'Black' },
        ],
      },
    ],
    // 筛选判定：名字以 value 开头（与 antd demo 一致）。
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
    sorter: (a, b) => a.name.length - b.name.length,
    sortDirections: ['descend'],
  },
  {
    title: 'Age',
    dataIndex: 'age',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    // S3：筛选（默认多选 Checkbox，与 antd 官方 head demo 逐字一致——官方此列无 filterMultiple）。
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) => record.address.indexOf(value as string) === 0,
  },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd head demo（逐字一致）
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    showSorterTooltip: { target: 'full-header' },
    filters: [
      { text: 'Joe', value: 'Joe' },
      { text: 'Jim', value: 'Jim' },
      {
        text: 'Submenu',
        value: 'Submenu',
        children: [
          { text: 'Green', value: 'Green' },
          { text: 'Black', value: 'Black' },
        ],
      },
    ],
    onFilter: (value, record) => record.name.indexOf(value as string) === 0,
    sorter: (a, b) => a.name.length - b.name.length,
    sortDirections: ['descend'],
  },
  {
    title: 'Age',
    dataIndex: 'age',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    filters: [
      { text: 'London', value: 'London' },
      { text: 'New York', value: 'New York' },
    ],
    onFilter: (value, record) => record.address.indexOf(value as string) === 0,
  },
]

// ---------------------------------------------------------------------------
// onChange（两侧共用同一个 console.log 形态）
// ---------------------------------------------------------------------------

const onChange: DgTableProps<RecordType>['onChange'] = (pagination, filters, sorter, extra) => {
  // eslint-disable-next-line no-console
  console.log('head demo onChange params:', { pagination, filters, sorter, extra })
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function HeadDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [bordered, setBordered] = useState(false)
  // Reset trick：递增 remountKey 强制两侧 Table 重新挂载，清空所有排序/筛选草稿与激活态
  // （不引入受控 filteredValue/sortOrder，保持 head demo 非受控本质）。
  const [remountKey, setRemountKey] = useState(0)

  const handleReset = () => setRemountKey((k) => k + 1)

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
          <Button onClick={handleReset}>Reset (remount both)</Button>
        </Space>
      </div>

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            key={`dg-${remountKey}`}
            columns={dgColumns}
            dataSource={data}
            onChange={onChange}
            showSorterTooltip={{ target: 'sorter-icon' }}
            bordered={bordered}
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType>
            key={`antd-${remountKey}`}
            columns={antdColumns}
            dataSource={data}
            onChange={onChange as TableProps<RecordType>['onChange']}
            showSorterTooltip={{ target: 'sorter-icon' }}
            bordered={bordered}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B5）：</strong>
          左右并排呈现 data-grid 与 antd head demo（排序 + 筛选共存，S1 + S3）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>Name</strong>：<code>sorter</code> 按名字长度 + <code>sortDirections: ['descend']</code>
              （点击循环 null → descend → null）；同时带 <code>filters</code>（Joe/Jim/Submenu→Green/Black，
              多选 Checkbox）+ <code>onFilter</code>。★ Submenu：左栏 data-grid 扁平化为顶层项（S7 已知简化），
              右栏 antd 原生 menu 二级（点 Submenu 弹 Green/Black）。
            </li>
            <li>
              <strong>Age</strong>：<code>sorter</code> 数值 + <code>defaultSortOrder: 'descend'</code>（初始降序）。
            </li>
            <li>
              <strong>Address</strong>：<code>filters</code>（London/New York）+ <code>onFilter</code>，
              默认多选 Checkbox（与官方 antd demo 逐字一致——两侧均无 filterMultiple）。
            </li>
            <li>
              <strong>filterOnClose=true</strong>（默认）：勾选后点外部/ESC 关闭即应用；确定按钮也应用；
              重置按钮清草稿（S5 经验：<code>clearFilters()</code> 无参默认 <code>{'{confirm:false}'}</code>，
              点 Reset 只清草稿不立即清表，与 antd <code>onReset</code> 一致，<strong>勿误判</strong>）。
            </li>
            <li>
              <strong>排序+筛选叠加</strong>：raw → sort → filter（与 antd 一致）。打开 console 查看 onChange
              参数（filters 形态 <code>{'{ [key]: value[] | null }'}</code>，extra.action='filter'/'sort'）。
            </li>
            <li>
              <strong>sortDirections 第三次回 null</strong>（S5 经验）：data-grid 与 antd
              <code>nextSortDirection</code> 逐字相同，耗尽回 null 是 antd 本身循环，<strong>勿误判</strong>。
            </li>
            <li>
              <strong>Bordered 开关</strong>：同时切换两侧边框。 <strong>Reset 按钮</strong>：递增 React key
              强制两侧 Table 重新挂载，清空所有排序/筛选草稿与激活态（不引入受控语义）。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
