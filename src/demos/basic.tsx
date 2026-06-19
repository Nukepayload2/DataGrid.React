/**
 * 复刻 antd basic demo：`G:\Projects\ant-design\components\table\demo\basic.tsx`。
 *
 * 与官方 demo 等价的列与数据；render 自定义单元格（Name 的 <a>、Tags、Action）。
 * 因 data-grid 不依赖 antd 本体，Tag/Flex/Space 等用最小内联实现替代（视觉等价）。
 */

import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string
  name: string
  age: number
  address: string
  tags: string[]
}

const tagColorMap: Record<string, string> = {
  geekblue: '#2f54eb',
  green: '#389e0d',
  volcano: '#fa541c',
}

function Tag({ color, children }: { color: string; children: import('react').ReactNode }) {
  const bg =
    color in tagColorMap ? tagColorMap[color] : color
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 7px',
        fontSize: 12,
        lineHeight: '20px',
        borderRadius: 4,
        color: bg,
        background: `${bg}1a`, // ~10% alpha
        border: `1px solid ${bg}33`,
        marginRight: 4,
      }}
    >
      {children}
    </span>
  )
}

const columns: ColumnType<DataType>[] = [
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
    render: (_, { tags }) => (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
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
      </span>
    ),
  },
  {
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </span>
    ),
  },
]

const data: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['kawaii'],
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
]

export default function BasicDemo() {
  return <Table<DataType> columns={columns} dataSource={data} />
}
