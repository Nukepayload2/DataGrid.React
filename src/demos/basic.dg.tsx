/**
 * basic demo 的 data-grid 段（左栏）。
 *
 * props：`{ bordered, virtual }`（由父组件传）。左栏用内联最小 Tag、Action 用 `<span>` + flex
 * （避免引入 antd Tag/Space）。
 */
import { Table } from '../table'
import type { ColumnType } from '../table'
import { data, tagColor, type RecordType } from './_compare/basic.shared'

/**
 * 左栏内联最小 Tag：data-grid 不依赖 antd Tag，用手写预设色色板 + 边框/背景还原外观。
 */
const inlineTagColorMap: Record<string, string> = {
  geekblue: '#2f54eb',
  green: '#389e0d',
  volcano: '#fa541c',
}

function InlineTag({
  color,
  children,
}: {
  color: string
  children: import('react').ReactNode
}) {
  const bg = color in inlineTagColorMap ? inlineTagColorMap[color] : color
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
    render: (_, { tags }) => (
      <span
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {tags.map((tag) => (
          <InlineTag color={tagColor(tag)} key={tag}>
            {tag.toUpperCase()}
          </InlineTag>
        ))}
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

export default function BasicDg({
  bordered = false,
  virtual = false,
}: {
  bordered: boolean
  virtual: boolean
}) {
  return (
    <Table<RecordType>
      columns={dgColumns}
      dataSource={data}
      bordered={bordered}
      /* pagination={{}}：对齐 antd 默认分页条（antd 对任意行数都渲染分页条；data-grid 不传=不渲染）。
         详见 docs/design-notes/pagination.md */
      pagination={{}}
      virtual={virtual}
      scroll={virtual ? { y: true } : undefined}
    />
  )
}
