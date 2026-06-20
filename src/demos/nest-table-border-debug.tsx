/**
 * 复刻 antd `nest-table-border-debug` demo：
 *   `G:\Projects\ant-design\components\table\demo\nest-table-border-debug.tsx`
 *
 * === D1 边界/隔离用例：嵌套表格父子 bordered 隔离 ===
 *
 * **目标**：验证 M9 expandedRowRender 嵌套子 Table + S26 bordered 的**父子隔离**——
 * 主表 `bordered` 与子 Table `bordered` **各自独立**（父表开 bordered 不强制子表，反之亦然）。
 *
 * === antd demo 要素 ===
 *
 * - 顶部 Form（inline）含两个 Switch：
 *     * `Root Table Bordered`：主表 bordered 开关。
 *     * `Child Table Bordered`：子 Table bordered 开关。
 * - 主表 7 列：Name / Platform / Version / Upgraded / Creator / Date / Action（Publish 链接），
 *   `title={() => 'cool'}` + `footer={() => 'cool'}`。
 * - `expandable.expandedRowRender`：返回嵌套子 `<Table>`（5 列：Date / Name /
 *   Status(Badge "Finished") / Upgrade Status / Action(Pause/Stop 链接 + More 下拉 Dropdown)），
 *   `pagination={false}`，子 Table 的 `bordered` 由 `childTableBordered` state 驱动。
 * - 3 行主表数据 + 3 行子表数据（固定 mock）。
 *
 * === data-grid 实现要点 ===
 *
 * - **M9 + S26 已支持**：M9 expandedRowRender 渲染任意 ReactNode（嵌套 Table 是独立 `<Table>`
 *   实例，自己的 grid 上下文，与主表正交）；S26 bordered 是每张 Table 自身的 prop。两者天然隔离——
 *   主表 `bordered={rootTableBordered}` 控制主表，子 Table `bordered={childTableBordered}`
 *   （在 expandedRowRender 闭包内）控制子表，互不影响。
 *
 * - **expandedRowRender 重建**：antd demo 用 `createExpandedRowRender(childTableBordered)()`
 *   每次切换返回新闭包；data-grid 等价写法——直接 `expandedRowRender={() => <Table bordered={childTableBordered} ... />}`，
 *   childTableBordered 变化时主表 columnTree 重建（闭包捕获最新值），子 Table 重新渲染。
 *
 * - **antd 组件复用**（决策 6）：Badge / Dropdown / Form / Switch 用 antd（非表格核心部位）。
 *   `DownOutlined` 自绘 SVG（与 nested-table / custom-filter-panel / drag-sorting-handler 约定一致，
 *   不 import @ant-design/icons——仅 antd 间接依赖）。
 *
 * === 验证点（D1）===
 *
 * 1. 顶部两个 Switch 独立控制主表/子表 bordered。
 * 2. 主表 bordered 开、子表 bordered 关：主表有外边框+竖线，展开后子表无边框（视觉对比明显）。
 * 3. 主表 bordered 关、子表 bordered 开：主表无边框，子表有边框（隔离验证）。
 * 4. title 'cool' / footer 'cool' 始终在主表上下（与 antd 一致）。
 * 5. 回归：nested-table / bordered / expand 等 M9/S24/S26 demo 不受影响（本 demo 仅新增，引擎零改动）。
 */

import { useState } from 'react'
import { Badge, Dropdown, Form, Space, Switch } from 'antd'
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'

interface DataType {
  key: React.Key
  name: string
  platform: string
  version: string
  upgradeNum: number
  creator: string
  createdAt: string
}

interface ExpandedDataType {
  key: React.Key
  date: string
  name: string
  upgradeNum: string
}

const items = [
  { key: '1', label: 'Action 1' },
  { key: '2', label: 'Action 2' },
]

const expandedColumns: ColumnType<ExpandedDataType>[] = [
  { title: 'Date', dataIndex: 'date', key: 'date' },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  {
    title: 'Status',
    key: 'state',
    render: () => (
      <span>
        <Badge status="success" />
        Finished
      </span>
    ),
  },
  { title: 'Upgrade Status', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  {
    title: 'Action',
    dataIndex: 'operation',
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

const expandedDataSource: ExpandedDataType[] = Array.from({ length: 3 }).map(
  (_, i) => ({
    key: i,
    date: '2014-12-24 23:12:00',
    name: 'This is production name',
    upgradeNum: 'Upgraded: 56',
  }),
)

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Platform', dataIndex: 'platform', key: 'platform' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Upgraded', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Date', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Action', key: 'operation', render: () => <a>Publish</a> },
]

const dataSource: DataType[] = Array.from({ length: 3 }).map((_, i) => ({
  key: i,
  name: 'Screem',
  platform: 'iOS',
  version: '10.3.4.5654',
  upgradeNum: 500,
  creator: 'Jack',
  createdAt: '2014-12-24 23:12:00',
}))

/**
 * 内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
 * （仅 antd 间接依赖，与 nested-table / custom-filter-panel 等约定一致）。
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

export default function NestTableBorderDebugDemo() {
  // D1 核心：父子 bordered 各自受控（独立 Switch）。
  const [rootTableBordered, setRootTableBordered] = useState(true)
  const [childTableBordered, setChildTableBordered] = useState(true)

  // expandedRowRender 闭包捕获 childTableBordered：切换 Switch 时主表 columnTree 重建，
  // 子 Table 用新 bordered 重新渲染（M9 expandedRowRender 渲染任意 ReactNode 的天然能力）。
  const expandable: Expandable<DataType> = {
    expandedRowRender: () => (
      <Table<ExpandedDataType>
        columns={expandedColumns}
        dataSource={expandedDataSource}
        pagination={false}
        bordered={childTableBordered}
      />
    ),
  }

  return (
    <div style={{ padding: 24 }}>
      <Form
        layout="inline"
        className="table-demo-control-bar"
        style={{ marginBottom: 16 }}
      >
        <Form.Item label="Root Table Bordered">
          <Switch
            checked={rootTableBordered}
            onChange={(v) => setRootTableBordered(v)}
          />
        </Form.Item>
        <Form.Item label="Child Table Bordered">
          <Switch
            checked={childTableBordered}
            onChange={(v) => setChildTableBordered(v)}
          />
        </Form.Item>
      </Form>

      <Table<DataType>
        title={() => 'cool'}
        footer={() => 'cool'}
        columns={columns}
        expandable={expandable}
        dataSource={dataSource}
        bordered={rootTableBordered}
      />

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
        }}
      >
        <strong>D1 嵌套表格父子 bordered 隔离</strong>：主表 <code>bordered</code> 与
        expandedRowRender 内子 Table 的 <code>bordered</code> 各自独立（两个 Switch）。
        切换 Root Switch 仅影响主表外边框/竖线；切换 Child Switch 仅影响展开后子 Table 的边框——
        引擎零改动（M9 expandedRowRender 渲染任意 ReactNode + S26 bordered 是每张 Table 自身 prop，天然隔离）。
      </div>
    </div>
  )
}
