import { Badge, Dropdown, Space, Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import {
  dataSource,
  expandedDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nest-table-border-debug.shared'

const antdExpandedColumns: TableColumnsType<ExpandedDataType> = [
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
      <Space size="medium">
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

const antdColumns: TableColumnsType<RecordType> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Platform', dataIndex: 'platform', key: 'platform' },
  { title: 'Version', dataIndex: 'version', key: 'version' },
  { title: 'Upgraded', dataIndex: 'upgradeNum', key: 'upgradeNum' },
  { title: 'Creator', dataIndex: 'creator', key: 'creator' },
  { title: 'Date', dataIndex: 'createdAt', key: 'createdAt' },
  { title: 'Action', key: 'operation', render: () => <a>Publish</a> },
]

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

export default function NestTableBorderDebugAntd({
  rootTableBordered = true,
  childTableBordered = true,
  virtual = false,
}: {
  rootTableBordered: boolean
  childTableBordered: boolean
  virtual: boolean
}) {
  const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
    expandedRowRender: () => (
      <AntdTable<ExpandedDataType>
        columns={antdExpandedColumns}
        dataSource={expandedDataSource}
        pagination={false}
        bordered={childTableBordered}
      />
    ),
  }

  return (
    <AntdTable<RecordType>
      title={() => 'cool'}
      footer={() => 'cool'}
      columns={antdColumns}
      expandable={antdExpandable}
      dataSource={dataSource}
      bordered={rootTableBordered}
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
