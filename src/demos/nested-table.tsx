/**
 * 复刻 antd `nested-table` demo（S24 嵌套子表格）：
 *   `G:\Projects\ant-design\components\table\demo\nested-table.tsx`
 *
 * === 决策 9 双栏对照 ===
 *
 * - **左栏（data-grid Table）**：行为与改造前一致（`expandable.expandedRowRender`
 *   返回嵌套子 `<Table>` —— 独立 grid 上下文，与主表正交 + `defaultExpandedRowKeys: ['0']`）。
 *   子表也是 data-grid `<Table>`（独立 grid 上下文）。
 * - **右栏（antd Table）**：忠实复刻 antd nested-table demo（antd `<Table>` 主表 +
 *   `expandedRowRender` 返回真实 antd `<Table>` 子表 + `defaultExpandedRowKeys: ['0']`）。
 * - **共享状态 + 控制条**：`Segmented` size（large/medium/small）同时驱动两侧主表
 *   —— 决策 9 要求「同一状态同时驱动两侧」，故将 antd demo 原本的「三张主表静态展示
 *   （large/medium/small）」改为「单主表 + size 切换」，对照同一档 size 下两侧嵌套子表
 *   行为更直观（三表结构在双栏下会变成 6 张表，对照反而不便）。
 * - **共享数据**：`RecordType` + `ExpandedDataType` + `dataSource` + `expandDataSource`
 *   + Dropdown items 见 `_compare/nested-table.shared.ts`。
 *
 * === antd demo 要素（S24 嵌套子表格）===
 *
 * - 主表 7 列：Name / Platform / Version / Upgraded / Creator / Date / Action。
 * - `expandable.expandedRowRender`：返回一个**嵌套子 `<Table>`**（子表格，5 列：
 *   Date / Name / Status(Badge) / Upgrade Status / Action(Dropdown)），`pagination={false}`。
 * - `expandable.defaultExpandedRowKeys: ['0']`：初始展开 key='0' 的行。
 * - 三张主表演示 size：默认（large）/ `size="medium"` / `size="small"`。
 *
 * === data-grid 实现（S24）要点 ===
 *
 * - **M9 复用，引擎零改动**：M9 的 `expandedRowRender` 渲染任意 ReactNode
 *   （GridTable.renderExpandedContents 把返回内容放进 `dg-row-expanded` div，
 *    grid-column: 1 / -1 跨整行）。嵌套 `<Table>` 只是其中一种 ReactNode——
 *   它是独立的 `<Table>` 实例（自己的 columns/dataSource/size），与主表正交，
 *   能正常渲染（grid 布局嵌套：子 Table 自己的 dg-grid 容器，独立 grid 上下文）。
 *
 * - **antd 组件复用**（决策 6）：子表 Status 用 antd `<Badge>`、Action 用 antd `<Space>`
 *   + `<Dropdown>`（表格非核心部位用 antd）。`DownOutlined` 内联 SVG
 *   （**不 import @ant-design/icons**——与 custom-filter-panel / drag-sorting-handler 约定一致）。
 *
 * === 两侧保留的差异 ===
 *
 * - 嵌套子表实现：左栏子表是 data-grid `<Table>`（独立 grid 上下文）；右栏子表是真实 antd `<Table>`。
 * - size 类型：data-grid `medium` = antd `middle`（antd v6 也接受 `medium` 别名，视觉一致）。
 * - DownOutlined：左栏内联 SVG（不依赖 @ant-design/icons）；右栏 antd demo 用
 *   `@ant-design/icons` 的 `DownOutlined`（antd 间接依赖，本就可用）。
 *
 * === 验证点（S24 + 决策 9）===
 *
 * 1. 主表第一列为展开图标列；key='0' 的行初始展开（defaultExpandedRowKeys）。
 * 2. 展开内容为一个**嵌套子 Table**（5 列）：Date / Name / Status(Badge "Finished") /
 *    Upgrade Status / Action(Pause/Stop 链接 + More 下拉)。
 * 3. 子表 `pagination={false}`（不渲染分页器，3 行全显）。
 * 4. 点击其它行展开图标可展开/收起。
 * 5. 顶部 Segmented size（large/medium/small）同时驱动两侧主表 —— 两侧同步。
 */

import { useState } from 'react'
import { Badge, Dropdown, Segmented, Space, Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import {
  dataSource,
  expandDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nested-table.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义 —— 行为与改造前一致
// ---------------------------------------------------------------------------

const dgExpandColumns: ColumnType<ExpandedDataType>[] = [
  { title: 'Date', dataIndex: 'date', key: 'date' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Status',
    key: 'state',
    render: () => <Badge status="success" text="Finished" />,
  },
  { title: 'Upgrade Status', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  {
    title: 'Action',
    key: 'operation',
    render: () => (
      <Space size="middle">
        <a>Pause</a>
        <a>Stop</a>
        <Dropdown menu={{ items }}>
          <a>
            More <DownOutlined />
          </a>
        </Dropdown>
      </Space>
    ),
  },
]

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Platform', dataIndex: 'platform', key: 'platform' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Upgraded', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Date', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Action', key: 'operation', render: () => <a>Publish</a> },
]

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd nested-table demo
// ---------------------------------------------------------------------------

const antdExpandColumns: TableColumnsType<ExpandedDataType> = [
  { title: 'Date', dataIndex: 'date', key: 'date' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Status',
    key: 'state',
    render: () => <Badge status="success" text="Finished" />,
  },
  { title: 'Upgrade Status', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  {
    title: 'Action',
    key: 'operation',
    render: () => (
      <Space size="medium">
        <a>Pause</a>
        <a>Stop</a>
        <Dropdown menu={{ items }}>
          <a>
            More <DownOutlined />
          </a>
        </Dropdown>
      </Space>
    ),
  },
]

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Platform', dataIndex: 'platform', key: 'platform' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Upgraded', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Date', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Action', key: 'operation', render: () => <a>Publish</a> },
]

// ---------------------------------------------------------------------------
// expandable（两侧同款：defaultExpandedRowKeys + 嵌套子 Table）
// ---------------------------------------------------------------------------

const dgExpandable: Expandable<RecordType> = {
  // 嵌套子 Table 是 data-grid <Table>（独立 grid 上下文）。
  expandedRowRender: () => (
    <Table<ExpandedDataType>
      columns={dgExpandColumns}
      dataSource={expandDataSource}
      pagination={false}
    />
  ),
  defaultExpandedRowKeys: ['0'],
}

const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
  // 嵌套子 Table 是真实 antd <Table>（与 antd demo 逐字一致）。
  expandedRowRender: () => (
    <AntdTable<ExpandedDataType>
      columns={antdExpandColumns}
      dataSource={expandDataSource}
      pagination={false}
    />
  ),
  defaultExpandedRowKeys: ['0'],
}

/**
 * 内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
 * （仅 antd 间接依赖，与 custom-filter-panel / drag-sorting-handler 约定一致）。
 * SVG 路径取自 ant-design-icons DownOutlined。
 */
function DownOutlined() {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: '-0.125em' }}
    >
      <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

// 共享 size 类型：'large'/'medium'/'small' 在两侧都被接受
// （data-grid 用 'medium'（= 'middle'）；antd v6 也接受 'medium' 别名（= 'middle'））。
type SharedSize = 'large' | 'medium' | 'small'

export default function NestedTableDemo() {
  // ★ 共享状态：同一个 size 同时驱动两侧主表。
  const [size, setSize] = useState<SharedSize>('large')

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。 */}
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
          <Segmented
            value={size}
            onChange={(val) => setSize(val as SharedSize)}
            options={[
              { label: 'large', value: 'large' },
              { label: 'medium', value: 'medium' },
              { label: 'small', value: 'small' },
            ]}
          />
          <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
            size 同时驱动两侧主表（antd demo 原本三表静态展示，决策 9 下改为单表 + size 切换）
          </span>
        </Space>
      </div>

      {/*
        minPaneWidth=480（嵌套子表内容稍宽，主表 7 列 + 子表 5 列无 scroll.x）→
        横排阈值 ≈ 976。常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <Table<RecordType>
            columns={dgColumns}
            expandable={dgExpandable}
            dataSource={dataSource}
            size={size}
            // 主表 pagination={{}} 对齐右栏 antd 默认分页（antd 对任意数据都渲染 .ant-pagination）。
            // 子表（dgExpandable.expandedRowRender）pagination={false} 与右栏 antd 子表一致，不动。
            pagination={{}}
          />
        }
        right={
          <AntdTable<RecordType>
            columns={antdColumns}
            expandable={antdExpandable}
            dataSource={dataSource}
            size={size}
          />
        }
      >
        <div>
          <strong>对照说明（决策 9 B10 / S24 嵌套子表格）：</strong>
          左右并排呈现 data-grid 与 antd nested-table demo（expandedRowRender 返回嵌套子 Table +
          defaultExpandedRowKeys: ['0'] + size 切换）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>嵌套子表实现</strong>：左栏子表是 data-grid <code>&lt;Table&gt;</code>
              （独立 grid 上下文，与主表正交）；右栏子表是真实 antd <code>&lt;Table&gt;</code>。
            </li>
            <li>
              <strong>初始展开</strong>：key='0' 的行初始展开（<code>defaultExpandedRowKeys: ['0']</code>）；
              展开内容为 5 列子表（Date / Name / Status(Badge "Finished") / Upgrade Status / Action），
              <code> pagination={'{false}'}</code> 不分页。
            </li>
            <li>
              <strong>size 三档</strong>：顶部 Segmented 切换 large/medium/small，
              <strong> 同一档 size 同时驱动两侧主表</strong>（antd demo 原本三表静态展示，
              决策 9 下改为单表 + size 切换，对照更直观）。
            </li>
            <li>
              <strong>DownOutlined 差异</strong>：左栏内联 SVG（不依赖 @ant-design/icons）；
              右栏 antd demo 用 <code>@ant-design/icons</code> 的 <code>DownOutlined</code>
              （antd 间接依赖）。视觉等价。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
