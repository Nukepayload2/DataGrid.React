/**
 * nested-table demo 的 antd 段（右栏）。
 * 忠实复刻 antd nested-table demo：antd `<Table>` 主表 + antd `<Table>` 子表 +
 * antd `<DownOutlined>`（@ant-design/icons）。
 */
import { Badge, Dropdown, Space, Table as AntdTable } from 'antd'
import type { TableColumnsType, TableProps } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import {
  dataSource,
  expandDataSource,
  items,
  type ExpandedDataType,
  type RecordType,
} from './_compare/nested-table.shared'

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

// defaultExpandedRowKeys 是配置型初值（非受控），随 expandable 派生即可。
const antdExpandable: NonNullable<TableProps<RecordType>['expandable']> = {
  // 嵌套子 Table 是真实 antd <Table>。
  expandedRowRender: () => (
    <AntdTable<ExpandedDataType>
      columns={antdExpandColumns}
      dataSource={expandDataSource}
      pagination={false}
    />
  ),
  defaultExpandedRowKeys: ['0'],
}

export default function NestedTableAntd({
  size = 'large',
  virtual = false,
}: {
  size: 'large' | 'medium' | 'small'
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      expandable={antdExpandable}
      dataSource={dataSource}
      size={size}
      virtual={virtual}
      scroll={virtual ? { y: 300 } : undefined}
    />
  )
}
