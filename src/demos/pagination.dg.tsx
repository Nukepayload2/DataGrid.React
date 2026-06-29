/**
 * pagination demo 的 data-grid 段（左栏）。
 *
 * props 驱动 `{ placement, virtual }`（由父组件传）。子组件把 placement 包成
 * `placement: [placement]` 单元素数组传给 Table pagination（v6 数组语义 = 单翻页器）。
 * data-grid 默认不分页，本 demo 显式传 `pagination` 对象启用。
 */
import { Flex, Space, Tag } from 'antd'
import { Table } from '../table'
import type { ColumnType } from '../table'
import {
  data,
  type RecordType,
  type TablePaginationPlacement,
} from './_compare/pagination.shared'

// ---------------------------------------------------------------------------
// 列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
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
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
]

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

// placement 默认 bottomEnd（antd Table 真实默认：单翻页器右下角）。
export default function PaginationDg({
  placement = 'bottomEnd',
  virtual = false,
}: {
  placement: TablePaginationPlacement
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      pagination={{ placement: [placement] }}
      dataSource={data}
      /* ON 时 virtual=true + scroll.y:true（CSS 自适应填满 SplitDemo 限高，分页条在滚动区下方）。 */
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
