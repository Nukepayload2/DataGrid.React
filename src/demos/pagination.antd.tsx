/**
 * pagination demo 的 antd 段（右栏）。忠实复刻 antd pagination demo 列定义 + 同款 pagination +
 * 同款 placement 单元素数组。props 驱动 `{ placement, virtual }`（与左栏同款签名）。
 */
import { Flex, Space, Table as AntdTable, Tag } from 'antd'
import type { TableProps } from 'antd'
import {
  data,
  type RecordType,
  type TablePaginationPlacement,
} from './_compare/pagination.shared'

// ---------------------------------------------------------------------------
// 列定义 —— 忠实复刻 antd pagination demo 列定义
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

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
      /* ON 时 virtual=true + scroll.y:280（antd 分页条画在 scroll.y 之外，需扣除表头与分页条高）。 */
      virtual={virtual}
      scroll={virtual ? { y: 280 } : undefined}
    />
  )
}
