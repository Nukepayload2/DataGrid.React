import { Flex, Space, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import {
  data,
  type RecordType,
  type TablePaginationPlacement,
} from './_compare/pagination.shared'

const antdColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <a>{text}</a>,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    render: (tags: string[]) => (
      <Flex gap="small" align="center" wrap>
        {tags.map((tag) => {
          let color = tag.length > 5 ? 'geekblue' : 'green'
          if (tag === 'kawaii') {
            color = 'volcano'
          }
          return (
            <Tag color={color} key={tag}>
              {tag.toUpperCase()}
            </Tag>
          )
        })}
      </Flex>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Space size="medium">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

export default function PaginationAntd({
  placement = 'bottomEnd',
  virtual = false,
}: {
  placement: TablePaginationPlacement
  virtual: boolean
}) {
  return (
    <AntdTable<RecordType>
      columns={antdColumns}
      pagination={{ placement: [placement] }}
      dataSource={data}
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
