/**
 * nest-table-border-debug demo 的 data-grid 段（左栏）。
 * 主表 + expandedRowRender 返回嵌套子 data-grid `<Table>`（独立 grid 上下文，与主表正交），
 * 子 Table bordered 由 childTableBordered 驱动。内联 `DgDownOutlined`（避免直接依赖 @ant-design/icons）。
 */
import { Badge, Dropdown, Space } from 'antd'
import { Table } from '../table'
import type { ColumnType, Expandable } from '../table'
import {
  dataSource,
  expandedDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nest-table-border-debug.shared'

const dgExpandedColumns: ColumnType<ExpandedDataType>[] = [
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
            More <DgDownOutlined />
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

// 内联 DownOutlined（More 链接右侧的小箭头）——避免直接依赖 @ant-design/icons
// （仅 antd 间接依赖）。SVG 路径取自 ant-design-icons DownOutlined。
function DgDownOutlined() {
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

export default function NestTableBorderDebugDg({
  rootTableBordered = true,
  childTableBordered = true,
  virtual = false,
}: {
  rootTableBordered: boolean
  childTableBordered: boolean
  virtual: boolean
}) {
  // expandedRowRender 闭包捕获 childTableBordered——切换 Switch 时主表 columnTree 重建，
  // 子 Table 用新 bordered 重新渲染。
  const dgExpandable: Expandable<RecordType> = {
    expandedRowRender: () => (
      <Table<ExpandedDataType>
        columns={dgExpandedColumns}
        dataSource={expandedDataSource}
        pagination={false}
        bordered={childTableBordered}
      />
    ),
  }

  return (
    <Table<RecordType>
      title={() => 'cool'}
      footer={() => 'cool'}
      columns={dgColumns}
      expandable={dgExpandable}
      dataSource={dataSource}
      bordered={rootTableBordered}
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
