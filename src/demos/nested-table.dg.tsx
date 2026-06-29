/**
 * nested-table demo 的 data-grid 段（左栏）。
 * 主表 7 列 + expandedRowRender 返回嵌套子 data-grid `<Table>`（5 列，独立 grid 上下文）
 * + defaultExpandedRowKeys: ['0']。内联 `DownOutlined`（避免直接依赖 @ant-design/icons）。
 */
import { Badge, Dropdown, Space } from 'antd'
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'
import {
  dataSource,
  expandDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nested-table.shared'

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

// defaultExpandedRowKeys 是配置型初值（非受控），随 expandable 派生即可。
const dgExpandable: Expandable<RecordType> = {
  // 嵌套子 Table 是 data-grid <Table>（独立 grid 上下文，与主表正交）。
  expandedRowRender: () => (
    <Table<ExpandedDataType>
      columns={dgExpandColumns}
      dataSource={expandDataSource}
      pagination={false}
    />
  ),
  defaultExpandedRowKeys: ['0'],
}

// 内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
// （仅 antd 间接依赖）。SVG 路径取自 ant-design-icons DownOutlined。
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

export default function NestedTableDg({
  size = 'large',
  virtual = false,
}: {
  size: 'large' | 'medium' | 'small'
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      expandable={dgExpandable}
      dataSource={dataSource}
      size={size}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
