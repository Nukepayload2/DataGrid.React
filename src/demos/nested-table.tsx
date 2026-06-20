/**
 * 复刻 antd `nested-table` demo：
 *   `G:\Projects\ant-design\components\table\demo\nested-table.tsx`
 *
 * === antd demo 要素（S24 嵌套子表格）===
 *
 * - 主表 7 列：Name / Platform / Version / Upgraded / Creator / Date / Action。
 * - `expandable.expandedRowRender`：返回一个**嵌套子 `<Table>`**（子表格，5 列：
 *   Date / Name / Status(Badge) / UpgradeNum / Action(Dropdown)），`pagination={false}`。
 * - `expandable.defaultExpandedRowKeys: ['0']`：初始展开 key='0' 的行。
 * - **三张主表**演示 size：默认（large）/ `size="medium"` / `size="small"`。
 *
 * === data-grid 实现（S24）要点 ===
 *
 * - **M9 复用，引擎零改动**：M9 的 `expandedRowRender` 渲染任意 ReactNode
 *   （GridTable.renderExpandedContents 把返回内容放进 `dg-row-expanded` div，
 *    grid-column: 1 / -1 跨整行）。嵌套 `<Table>` 只是其中一种 ReactNode——
 *   它是独立的 `<Table>` 实例（自己的 columns/dataSource/size），与主表正交，
 *   能正常渲染（grid 布局嵌套：子 Table 自己的 dg-grid 容器，独立 grid 上下文）。
 *
 * - **size 类型**：antd v6 size 签名 `'large' | 'medium' | 'small' | 'compact'`。
 *   data-grid 既有 `'middle'`（v5 别名），S24 补 `'medium'`/`'compact'`（types.ts SizeType 扩展 +
 *   Table.tsx sizeToClass 把 medium 映射到 dg-size-middle、compact 映射到 dg-size-small，
 *   视觉等价；完整行高 padding 微调属 S27 任务）。
 *
 * - **antd 组件复用**（决策 6）：子表 Status 用 antd `<Badge>`、Action 用 antd `<Space>` + `<Dropdown>`
 *   （表格非核心部位用 antd）。`DownOutlined` 内联 SVG（**不 import @ant-design/icons**——
 *   与 custom-filter-panel / drag-sorting-handler 约定一致，@ant-design/icons 仅 antd 间接依赖）。
 *
 * === 验证点（S24）===
 *
 * 1. 三张主表上下排列，分别 large / medium / small（size 不同——S27 完整后行高 padding 差异可见；
 *    S24 阶段 medium 与 middle 视觉等价、small 与 compact 等价，不崩即可）。
 * 2. 每张主表第一列为展开图标列；key='0' 的行初始展开（defaultExpandedRowKeys）。
 * 3. 展开内容为一个**嵌套子 Table**（5 列）：Date / Name / Status(Badge "Finished") /
 *    Upgrade Status / Action(Pause/Stop 链接 + More 下拉)。
 * 4. 子表 `pagination={false}`（不渲染分页器，3 行全显）。
 * 5. 点击其它行展开图标可展开/收起（M9 0fr↔1fr 过渡）。
 * 6. 回归：expand / expand-sticky / order-column 等 M9 demo 不受影响（expandedRowRender 非 Table 内容仍正常）。
 */

import { Badge, Dropdown, Space } from 'antd'
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'

interface ExpandedDataType {
  key: React.Key
  date: string
  name: string
  upgradeNum: string
}

interface DataType {
  key: React.Key
  name: string
  platform: string
  version: string
  upgradeNum: number
  creator: string
  createdAt: string
}

const items = [
  { key: '1', label: 'Action 1' },
  { key: '2', label: 'Action 2' },
]

const expandDataSource: ExpandedDataType[] = Array.from({ length: 3 }).map(
  (_, i) => ({
    key: i.toString(),
    date: '2014-12-24 23:12:00',
    name: 'This is production name',
    upgradeNum: 'Upgraded: 56',
  }),
)

const dataSource: DataType[] = Array.from({ length: 3 }).map((_, i) => ({
  key: i.toString(),
  name: 'Screen',
  platform: 'iOS',
  version: '10.3.4.5654',
  upgradeNum: 500,
  creator: 'Jack',
  createdAt: '2014-12-24 23:12:00',
}))

const expandColumns: ColumnType<ExpandedDataType>[] = [
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

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Platform', dataIndex: 'platform', key: 'platform' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Upgraded', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Date', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Action', key: 'operation', render: () => <a>Publish</a> },
]

/**
 * 展开行渲染：返回嵌套子 `<Table>`（S24 核心）。
 * M9 的 expandedRowRender 渲染任意 ReactNode，嵌套 Table 作为独立实例正常工作。
 */
const expandedRowRender = () => (
  <Table<ExpandedDataType>
    columns={expandColumns}
    dataSource={expandDataSource}
    pagination={false}
  />
)

const expandable: Expandable<DataType> = {
  expandedRowRender,
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

export default function NestedTableDemo() {
  return (
    <div style={{ padding: 24 }}>
      {/* 默认 size（large） */}
      <Table<DataType>
        columns={columns}
        expandable={expandable}
        dataSource={dataSource}
      />

      {/* size="medium"（antd v6；data-grid 视觉等价 'middle'，S27 完整实现行高 padding） */}
      <div style={{ marginTop: 16 }}>
        <Table<DataType>
          columns={columns}
          expandable={expandable}
          dataSource={dataSource}
          size="medium"
        />
      </div>

      {/* size="small" */}
      <div style={{ marginTop: 16 }}>
        <Table<DataType>
          columns={columns}
          expandable={expandable}
          dataSource={dataSource}
          size="small"
        />
      </div>

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
        <strong>S24 嵌套子表格</strong>：展开行内嵌套子 <code>&lt;Table&gt;</code>（
        <code>expandable.expandedRowRender</code> 返回子 Table）+
        <code> defaultExpandedRowKeys: ['0']</code>（初始展开）+ 三 size 演示（large / medium / small）。
        引擎零改动（M9 expandedRowRender 渲染任意 ReactNode，嵌套 Table 是其中之一）。子表 Status 用 antd Badge、
        Action 用 antd Dropdown/Space（决策 6）。
      </div>
    </div>
  )
}
